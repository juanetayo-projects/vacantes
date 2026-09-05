import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Badge, Boton, Modal, Textarea, Select, Input, TableShell, TableHead, TableEmpty, filaZebra } from '../components/ui'
import { ESTADO_VACANTE_LABELS, formatoFecha } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Fila = Tables<'vacantes'> & { areas: { nombre: string } | null; requisiciones: Tables<'requisiciones'>[] }

const CANALES = ['Portal de Empleo', 'Referidos', 'LinkedIn', 'Página Web', 'Bolsa Interna']

export default function Requisiciones() {
  const [params] = useSearchParams()
  const { perfil } = useAuth()
  const [vacantes, setVacantes] = useState<Fila[]>([])
  const [reclutadores, setReclutadores] = useState<Tables<'profiles'>[]>([])
  const [seleccion, setSeleccion] = useState<Fila | null>(null)
  const [guardando, setGuardando] = useState(false)

  const [analisis, setAnalisis] = useState('')
  const [descripcionEstandar, setDescripcionEstandar] = useState('')
  const [canales, setCanales] = useState<string[]>([])
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [reclutadorId, setReclutadorId] = useState('')
  const [presupuestoRecl, setPresupuestoRecl] = useState('')
  const [estrategia, setEstrategia] = useState('')

  async function cargar() {
    const [{ data }, { data: recl }] = await Promise.all([
      supabase.from('vacantes').select('*, areas(nombre), requisiciones(*)')
        .in('estado', ['aprobada', 'en_requisicion']).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').in('role', ['reclutador', 'admin']),
    ])
    setVacantes((data as any) ?? [])
    setReclutadores(recl ?? [])
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    const vid = params.get('vacante')
    if (vid && vacantes.length) {
      const v = vacantes.find((x) => String(x.id) === vid)
      if (v) abrir(v)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacantes.length])

  function abrir(v: Fila) {
    const req = v.requisiciones?.[0]
    setAnalisis(req?.analisis_puesto ?? '')
    setDescripcionEstandar(req?.descripcion_cargo_estandarizada ?? v.descripcion_cargo ?? '')
    setCanales(req?.canales_busqueda ?? [])
    setInicio(req?.cronograma_inicio ?? '')
    setFin(req?.cronograma_fin ?? '')
    setReclutadorId(req?.reclutador_id ?? '')
    setPresupuestoRecl(String(req?.presupuesto_reclutamiento ?? ''))
    setEstrategia(req?.estrategia_comunicacion ?? '')
    setSeleccion(v)
  }

  function toggleCanal(c: string) {
    setCanales((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  async function guardar(publicar: boolean) {
    if (!seleccion) return
    setGuardando(true)
    const req = seleccion.requisiciones?.[0]
    const payload = {
      vacante_id: seleccion.id,
      analisis_puesto: analisis,
      descripcion_cargo_estandarizada: descripcionEstandar,
      canales_busqueda: canales,
      cronograma_inicio: inicio || null,
      cronograma_fin: fin || null,
      reclutador_id: reclutadorId || null,
      presupuesto_reclutamiento: presupuestoRecl ? Number(presupuestoRecl) : null,
      estrategia_comunicacion: estrategia,
    }
    if (req) await supabase.from('requisiciones').update(payload).eq('id', req.id)
    else await supabase.from('requisiciones').insert(payload)

    await supabase.from('vacantes').update({
      estado: publicar ? 'publicada' : 'en_requisicion',
      reclutador_id: reclutadorId || null,
      fecha_publicacion: publicar ? new Date().toISOString().slice(0, 10) : null,
    }).eq('id', seleccion.id)

    setGuardando(false)
    setSeleccion(null)
    cargar()
  }

  return (
    <div>
      <PageHeader titulo="Requisiciones y Plan de Reclutamiento" subtitulo="Vacantes aprobadas pendientes de plan de reclutamiento" />

      <TableShell>
        <TableHead>
          <th>Código</th><th>Cargo</th><th>Área</th><th>Estado</th><th>Aprobada</th><th />
        </TableHead>
        <tbody>
          {vacantes.map((v, i) => (
            <tr key={v.id} className={filaZebra(i)}>
              <td className="px-4 py-3 font-medium text-slate-700">{v.codigo}</td>
              <td className="px-4 py-3">{v.cargo}</td>
              <td className="px-4 py-3 text-slate-500">{v.areas?.nombre}</td>
              <td className="px-4 py-3"><Badge texto={ESTADO_VACANTE_LABELS[v.estado]} valor={v.estado} /></td>
              <td className="px-4 py-3 text-slate-500">{formatoFecha(v.created_at)}</td>
              <td className="px-4 py-3 text-right"><Boton className="!px-3 !py-1.5 text-xs" onClick={() => abrir(v)}>Diligenciar</Boton></td>
            </tr>
          ))}
          {!vacantes.length && <TableEmpty colSpan={6}>No hay vacantes pendientes de requisición</TableEmpty>}
        </tbody>
      </TableShell>

      <Modal open={!!seleccion} onClose={() => setSeleccion(null)} titulo={`Requisición · ${seleccion?.codigo}`} ancho="max-w-3xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Textarea label="Análisis del puesto" rows={3} value={analisis} onChange={(e) => setAnalisis(e.target.value)} />
            <Textarea label="Descripción de cargo estandarizada" rows={3} value={descripcionEstandar} onChange={(e) => setDescripcionEstandar(e.target.value)} />
            <Textarea label="Estrategia de comunicación" rows={3} value={estrategia} onChange={(e) => setEstrategia(e.target.value)} />
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-600">Canales de búsqueda</p>
              <div className="flex flex-wrap gap-2">
                {CANALES.map((c) => (
                  <button key={c} type="button" onClick={() => toggleCanal(c)}
                    className={`rounded-full border px-3 py-1 text-xs ${canales.includes(c) ? 'border-brand bg-brand text-white' : 'border-slate-300 text-slate-600'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Cronograma inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              <Input label="Cronograma fin" type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
            </div>
            <Select label="Reclutador asignado" value={reclutadorId} onChange={(e) => setReclutadorId(e.target.value)}>
              <option value="">Sin asignar</option>
              {reclutadores.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </Select>
            <Input label="Presupuesto de reclutamiento" type="number" value={presupuestoRecl} onChange={(e) => setPresupuestoRecl(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Boton variante="secundario" disabled={guardando} onClick={() => setSeleccion(null)}>Cancelar</Boton>
          <Boton variante="secundario" disabled={guardando} onClick={() => guardar(false)}>Guardar Borrador</Boton>
          <Boton disabled={guardando} onClick={() => guardar(true)}>Publicar Vacante</Boton>
        </div>
      </Modal>
    </div>
  )
}
