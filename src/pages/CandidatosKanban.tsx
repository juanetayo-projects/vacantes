import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, ArrowRight, ChevronRight, Search, PhoneCall } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Card, Modal, Boton, Input, Select, Textarea } from '../components/ui'
import { useAlert } from '../lib/alerts'
import type { Tables } from '../lib/database.types'

type Postulacion = Tables<'postulaciones'> & { candidatos: Tables<'candidatos'> }
type Candidato = Tables<'candidatos'>

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
  const { perfil } = useAuth()
  const { confirm, notify } = useAlert()
  const [vacante, setVacante] = useState<Tables<'vacantes'> | null>(null)
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([])
  const [modalNuevo, setModalNuevo] = useState(false)
  const [nombre, setNombre] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState<Tables<'candidatos'>['tipo_documento']>('CC')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fuente, setFuente] = useState<Tables<'candidatos'>['fuente']>('portal_empleo')
  const [guardando, setGuardando] = useState(false)

  // Banco de HV
  const [modalBanco, setModalBanco] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<Candidato[] | null>(null)

  // Verificación de llamada
  const [modalContacto, setModalContacto] = useState<Postulacion | null>(null)
  const [contactoEfectivo, setContactoEfectivo] = useState(true)
  const [interesado, setInteresado] = useState(true)
  const [observacionesContacto, setObservacionesContacto] = useState('')

  // Descarte con motivo
  const [modalDescarte, setModalDescarte] = useState<Postulacion | null>(null)
  const [motivoDescarte, setMotivoDescarte] = useState('')

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

  function abrirDescarte(p: Postulacion) {
    setMotivoDescarte('')
    setModalDescarte(p)
  }

  async function confirmarDescarte() {
    if (!modalDescarte) return
    await supabase.from('postulaciones').update({
      estado: 'descartado', motivo_descarte: motivoDescarte || 'manual',
    }).eq('id', modalDescarte.id)
    setModalDescarte(null)
    cargar()
  }

  function cerrarModalNuevo() {
    setModalNuevo(false)
    setNombre(''); setNumeroDocumento(''); setEmail(''); setTelefono('')
  }

  async function crearCandidato() {
    if (!nombre.trim()) return
    setGuardando(true)
    if (numeroDocumento.trim()) {
      const { data: existente } = await supabase.from('candidatos').select('id, nombre')
        .eq('numero_documento', numeroDocumento.trim()).maybeSingle()
      if (existente) {
        await supabase.from('postulaciones').insert({ vacante_id: Number(id), candidato_id: existente.id, estado: 'postulado' })
        notify(`${existente.nombre} ya estaba en el banco de HV con ese documento; se agregó a esta vacante.`, 'info')
        setGuardando(false)
        cerrarModalNuevo()
        cargar()
        return
      }
    }
    const { data: cand, error } = await supabase.from('candidatos')
      .insert({ nombre, email, telefono, fuente, tipo_documento: numeroDocumento.trim() ? tipoDocumento : null, numero_documento: numeroDocumento.trim() || null })
      .select('id').single()
    if (!error && cand) {
      await supabase.from('postulaciones').insert({ vacante_id: Number(id), candidato_id: cand.id, estado: 'postulado' })
    }
    setGuardando(false)
    cerrarModalNuevo()
    cargar()
  }

  // --- Banco de HV ---
  function abrirBanco() {
    setBusqueda(''); setResultados(null)
    setModalBanco(true)
  }

  async function buscarEnBanco() {
    if (!busqueda.trim()) return
    setBuscando(true)
    const idsYaEnVacante = postulaciones.map((p) => p.candidato_id)
    const b = busqueda.trim()
    let q = supabase.from('candidatos').select('*')
      .or(`nombre.ilike.%${b}%,formacion.ilike.%${b}%,numero_documento.ilike.%${b}%,telefono.ilike.%${b}%,email.ilike.%${b}%`)
      .limit(20)
    if (idsYaEnVacante.length) q = q.not('id', 'in', `(${idsYaEnVacante.join(',')})`)
    const { data } = await q
    setResultados(data ?? [])
    setBuscando(false)
  }

  async function marcarCoincidencia(c: Candidato) {
    await supabase.from('postulaciones').insert({ vacante_id: idNum, candidato_id: c.id, estado: 'postulado' })
    notify(`${c.nombre} se agregó a Postulados.`, 'success')
    setResultados((prev) => (prev ?? []).filter((x) => x.id !== c.id))
    cargar()
  }

  async function abrirConvocatoria() {
    if (!perfil) return
    const ok = await confirm(
      'Se creará un pendiente en la bandeja de convocatorias para que otro miembro de Talento Humano busque candidatos por fuera de la app (redes, avisos, referidos).',
      { titulo: 'Abrir convocatoria externa', textoConfirmar: 'Abrir convocatoria' },
    )
    if (!ok) return
    await supabase.from('convocatorias_pendientes').insert({ vacante_id: idNum, abierta_por: perfil.id })
    notify('Se abrió la convocatoria en la bandeja de Talento Humano.', 'success')
    setModalBanco(false)
  }

  // --- Verificación de llamada ---
  function abrirContacto(p: Postulacion) {
    setContactoEfectivo(true); setInteresado(true); setObservacionesContacto('')
    setModalContacto(p)
  }

  async function guardarContacto() {
    if (!modalContacto || !perfil) return
    const avanza = contactoEfectivo && interesado
    const motivo = !contactoEfectivo ? 'no_contactado' : !interesado ? 'no_interesado' : null
    await supabase.from('postulaciones').update({
      fecha_contacto: new Date().toISOString(),
      contacto_efectivo: contactoEfectivo,
      interesado: contactoEfectivo ? interesado : null,
      observaciones_contacto: observacionesContacto || null,
      contactado_por: perfil.id,
      estado: avanza ? 'preseleccionado' : 'descartado',
      motivo_descarte: motivo,
      updated_at: new Date().toISOString(),
    }).eq('id', modalContacto.id)

    if (avanza && modalContacto.candidatos.email) {
      const { data: tokenRow } = await supabase.from('candidato_tokens')
        .insert({ postulacion_id: modalContacto.id, tipo: 'documentos' }).select('token').single()
      if (tokenRow) {
        const { data: sesion } = await supabase.auth.getSession()
        const { data, error } = await supabase.functions.invoke('notificar-candidato', {
          body: { postulacion_id: modalContacto.id, tipo: 'documentos', token: tokenRow.token },
          headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
        })
        if (error || data?.error) notify(`El candidato avanzó, pero no se pudo enviar el correo: ${data?.error ?? error?.message}`, 'warning')
        else notify('Se envió al candidato el enlace para cargar su documentación.', 'success')
      }
    } else if (avanza) {
      notify('El candidato avanzó, pero no tiene correo registrado para enviarle el enlace.', 'warning')
    }

    setModalContacto(null)
    cargar()
  }

  return (
    <div>
      <PageHeader titulo={`Candidatos · ${vacante?.cargo ?? ''}`} subtitulo={vacante?.codigo}
        acciones={
          <div className="flex gap-2">
            <Boton variante="secundario" onClick={abrirBanco}><Search size={16} className="mr-1 inline" />Banco de HV</Boton>
            <Boton onClick={() => setModalNuevo(true)}><Plus size={16} className="mr-1 inline" />Agregar Candidato</Boton>
          </div>
        } />

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
                      <Link to={`/postulaciones/${p.id}/evaluacion`} className="flex items-center gap-1 text-xs font-medium text-brand-light hover:underline">
                        Ver más <ChevronRight size={12} />
                      </Link>
                      <div className="flex gap-1">
                        <button onClick={() => abrirDescarte(p)} className="text-[11px] text-red-500 hover:underline">Descartar</button>
                        {col.estado === 'postulado' ? (
                          <button onClick={() => abrirContacto(p)} className="flex items-center gap-0.5 text-[11px] font-medium text-brand-light hover:underline">
                            <PhoneCall size={11} /> Registrar Contacto
                          </button>
                        ) : SIGUIENTE[p.estado] && (
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
          <div className="flex gap-2">
            <div className="w-28">
              <Select label="Tipo doc." value={tipoDocumento ?? 'CC'} onChange={(e) => setTipoDocumento(e.target.value as any)}>
                <option value="CC">CC</option>
                <option value="CE">CE</option>
                <option value="TI">TI</option>
                <option value="PA">PA</option>
              </Select>
            </div>
            <div className="flex-1">
              <Input label="Número de documento" value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} />
            </div>
          </div>
          <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <Select label="Fuente" value={fuente ?? 'portal_empleo'} onChange={(e) => setFuente(e.target.value as any)}>
            <option value="portal_empleo">Portal de Empleo</option>
            <option value="referido">Referido</option>
            <option value="linkedin">LinkedIn</option>
            <option value="pagina_web">Página Web</option>
            <option value="otros">Otros</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModalNuevo(false)}>Cancelar</Boton>
            <Boton disabled={guardando} onClick={crearCandidato}>{guardando ? 'Guardando…' : 'Agregar'}</Boton>
          </div>
        </div>
      </Modal>

      <Modal open={modalBanco} onClose={() => setModalBanco(false)} titulo="Banco de Hojas de Vida" ancho="max-w-lg">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500">Busca en el banco de candidatos existentes por nombre, documento, teléfono, correo o formación.</p>
          <div className="flex gap-2">
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), buscarEnBanco())}
              placeholder="Ej: enfermería, Juan Pérez, 10203040…"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <Boton onClick={buscarEnBanco} disabled={buscando}>{buscando ? 'Buscando…' : 'Buscar'}</Boton>
          </div>
          {resultados !== null && (
            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
              {resultados.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b border-slate-100 px-3 py-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {c.nombre} {c.numero_documento && <span className="font-normal text-slate-400">· {c.tipo_documento} {c.numero_documento}</span>}
                    </p>
                    <p className="text-xs text-slate-400">{c.formacion ?? c.email ?? c.telefono ?? '-'}</p>
                  </div>
                  <Boton className="!px-2 !py-1 text-xs" onClick={() => marcarCoincidencia(c)}>+ Agregar</Boton>
                </div>
              ))}
              {!resultados.length && (
                <div className="p-4 text-center">
                  <p className="mb-2 text-sm text-slate-500">No hay HV aptas en el banco.</p>
                  <Boton variante="secundario" onClick={abrirConvocatoria}>Abrir Convocatoria Externa</Boton>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={!!modalContacto} onClose={() => setModalContacto(null)} titulo={`Registrar contacto · ${modalContacto?.candidatos.nombre}`} ancho="max-w-sm">
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={contactoEfectivo} onChange={(e) => setContactoEfectivo(e.target.checked)} />
            Contacto efectivo
          </label>
          {contactoEfectivo && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={interesado} onChange={(e) => setInteresado(e.target.checked)} />
              El candidato está interesado
            </label>
          )}
          <Textarea label="Observaciones" rows={3} value={observacionesContacto} onChange={(e) => setObservacionesContacto(e.target.value)} />
          {(!contactoEfectivo || !interesado) && (
            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
              El candidato quedará descartado de esta vacante, pero permanece en el banco de HV para futuras convocatorias.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModalContacto(null)}>Cancelar</Boton>
            <Boton onClick={guardarContacto}>Guardar</Boton>
          </div>
        </div>
      </Modal>

      <Modal open={!!modalDescarte} onClose={() => setModalDescarte(null)} titulo={`Descartar a ${modalDescarte?.candidatos.nombre}`} ancho="max-w-sm">
        <div className="flex flex-col gap-3">
          <Textarea label="Motivo del descarte" rows={3} value={motivoDescarte} onChange={(e) => setMotivoDescarte(e.target.value)}
            placeholder="Ej: no cumple el perfil requerido" />
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModalDescarte(null)}>Cancelar</Boton>
            <Boton variante="peligro" onClick={confirmarDescarte}>Descartar</Boton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
