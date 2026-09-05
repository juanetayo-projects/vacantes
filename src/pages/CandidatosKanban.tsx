import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, ArrowRight, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PageHeader, Card, Modal, Boton, Input, Select } from '../components/ui'
import type { Tables } from '../lib/database.types'

type Postulacion = Tables<'postulaciones'> & { candidatos: Tables<'candidatos'> }

const COLUMNAS: { estado: Postulacion['estado']; titulo: string }[] = [
  { estado: 'postulado', titulo: 'Postulados' },
  { estado: 'preseleccionado', titulo: 'Preseleccionados' },
  { estado: 'entrevista', titulo: 'Entrevista' },
  { estado: 'finalista', titulo: 'Finalistas' },
]

const SIGUIENTE: Record<string, Postulacion['estado']> = {
  postulado: 'preseleccionado',
  preseleccionado: 'entrevista',
  entrevista: 'finalista',
  finalista: 'seleccionado',
}

export default function CandidatosKanban() {
  const { id } = useParams()
  const idNum = Number(id)
  const [vacante, setVacante] = useState<Tables<'vacantes'> | null>(null)
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([])
  const [modalNuevo, setModalNuevo] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fuente, setFuente] = useState<Tables<'candidatos'>['fuente']>('portal_empleo')
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    const [{ data: v }, { data: post }] = await Promise.all([
      supabase.from('vacantes').select('*').eq('id', idNum).single(),
      supabase.from('postulaciones').select('*, candidatos(*)').eq('vacante_id', idNum).order('fecha_postulacion'),
    ])
    setVacante(v)
    setPostulaciones((post as any) ?? [])
  }

  useEffect(() => { cargar() }, [id])

  async function avanzar(p: Postulacion) {
    const siguiente = SIGUIENTE[p.estado]
    if (!siguiente) return
    await supabase.from('postulaciones').update({ estado: siguiente, updated_at: new Date().toISOString() }).eq('id', p.id)
    cargar()
  }

  async function descartar(p: Postulacion) {
    await supabase.from('postulaciones').update({ estado: 'descartado' }).eq('id', p.id)
    cargar()
  }

  async function crearCandidato() {
    if (!nombre.trim()) return
    setGuardando(true)
    const { data: cand, error } = await supabase.from('candidatos').insert({ nombre, email, telefono, fuente }).select('id').single()
    if (!error && cand) {
      await supabase.from('postulaciones').insert({ vacante_id: Number(id), candidato_id: cand.id, estado: 'postulado' })
    }
    setGuardando(false)
    setModalNuevo(false)
    setNombre(''); setEmail(''); setTelefono('')
    cargar()
  }

  return (
    <div>
      <PageHeader titulo={`Candidatos · ${vacante?.cargo ?? ''}`} subtitulo={vacante?.codigo}
        acciones={<Boton onClick={() => setModalNuevo(true)}><Plus size={16} className="mr-1 inline" />Agregar Candidato</Boton>} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNAS.map((col) => {
          const items = postulaciones.filter((p) => p.estado === col.estado)
          return (
            <div key={col.estado}>
              <h3 className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-600">
                {col.titulo} <span className="rounded-full bg-slate-200 px-2 text-xs">{items.length}</span>
              </h3>
              <div className="flex flex-col gap-2">
                {items.map((p) => (
                  <Card key={p.id} className="!p-3">
                    <p className="text-sm font-medium text-slate-700">{p.candidatos.nombre}</p>
                    <p className="text-xs text-slate-400">{p.candidatos.formacion ?? p.candidatos.email}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {p.puntaje_ajuste ? `Puntaje: ${p.puntaje_ajuste}/100` : `Postulado: ${new Date(p.fecha_postulacion).toLocaleDateString('es-CO')}`}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <Link to={`/postulaciones/${p.id}/evaluacion`} className="flex items-center gap-1 text-xs font-medium text-[#16468E] hover:underline">
                        Ver más <ChevronRight size={12} />
                      </Link>
                      <div className="flex gap-1">
                        <button onClick={() => descartar(p)} className="text-[11px] text-red-500 hover:underline">Descartar</button>
                        {SIGUIENTE[p.estado] && (
                          <button onClick={() => avanzar(p)} className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-600 hover:underline">
                            Avanzar <ArrowRight size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                {!items.length && <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">Sin candidatos</p>}
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} titulo="Agregar Candidato">
        <div className="flex flex-col gap-3">
          <Input label="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <Select label="Fuente" value={fuente ?? 'portal_empleo'} onChange={(e) => setFuente(e.target.value as any)}>
            <option value="portal_empleo">Portal de Empleo</option>
            <option value="referido">Referido</option>
            <option value="linkedin">LinkedIn</option>
            <option value="pagina_web">Página Web</option>
            <option value="otros">Otros</option>
          </Select>
          <Boton disabled={guardando} onClick={crearCandidato}>{guardando ? 'Guardando…' : 'Agregar'}</Boton>
        </div>
      </Modal>
    </div>
  )
}
