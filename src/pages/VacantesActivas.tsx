import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PageHeader, FilterBar, Boton, Badge, Select, Input, TableShell, TableHead, TableEmpty, filaZebra } from '../components/ui'
import { ESTADO_VACANTE_LABELS, diasDesde } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Fila = Tables<'vacantes'> & { areas: { nombre: string } | null; postulantes: number }

const PAGE_SIZE = 8

export default function VacantesActivas() {
  const [vacantes, setVacantes] = useState<Fila[]>([])
  const [areas, setAreas] = useState<Tables<'areas'>[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [pagina, setPagina] = useState(1)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      const [{ data: vac }, { data: ar }, { data: post }] = await Promise.all([
        supabase.from('vacantes').select('*, areas(nombre)').order('created_at', { ascending: false }),
        supabase.from('areas').select('*').order('nombre'),
        supabase.from('postulaciones').select('vacante_id'),
      ])
      const conteo: Record<number, number> = {}
      for (const p of post ?? []) conteo[p.vacante_id] = (conteo[p.vacante_id] ?? 0) + 1
      setVacantes(((vac as any[]) ?? []).map((v) => ({ ...v, postulantes: conteo[v.id] ?? 0 })))
      setAreas(ar ?? [])
      setCargando(false)
    }
    cargar()
  }, [])

  const filtradas = useMemo(() => {
    return vacantes.filter((v) => {
      if (busqueda && !`${v.codigo} ${v.cargo}`.toLowerCase().includes(busqueda.toLowerCase())) return false
      if (filtroArea && String(v.area_id) !== filtroArea) return false
      if (filtroEstado && v.estado !== filtroEstado) return false
      return true
    })
  }, [vacantes, busqueda, filtroArea, filtroEstado])

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE))
  const pagina2 = Math.min(pagina, totalPaginas)
  const visibles = filtradas.slice((pagina2 - 1) * PAGE_SIZE, pagina2 * PAGE_SIZE)

  function destino(v: Fila) {
    if (v.estado === 'pendiente_aprobacion' || v.estado === 'borrador') return `/vacantes/${v.id}/aprobacion`
    if (['publicada', 'en_evaluacion'].includes(v.estado)) return `/vacantes/${v.id}/candidatos`
    return `/vacantes/${v.id}/aprobacion`
  }

  return (
    <div>
      <PageHeader titulo="Vacantes Activas" acciones={
        <Link to="/solicitudes/nueva"><Boton><Plus size={16} className="mr-1 inline" />Nueva Solicitud</Boton></Link>
      } />

      <FilterBar>
        <Input label="Buscar vacante o código" placeholder="VAC-2026-024, Médico..." value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }} className="w-64" />
        <Select label="Área" value={filtroArea} onChange={(e) => { setFiltroArea(e.target.value); setPagina(1) }}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </Select>
        <Select label="Estado" value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1) }}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_VACANTE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </FilterBar>

      <TableShell>
        <TableHead>
          <th>Código</th><th>Cargo</th><th>Área</th><th>Estado</th><th>Días Abiertos</th><th>Postulantes</th>
        </TableHead>
        <tbody>
          {visibles.map((v, i) => (
            <tr key={v.id} className={filaZebra(i)}>
              <td className="px-4 py-3">
                <Link to={destino(v)} className="font-medium text-brand-light hover:underline">{v.codigo}</Link>
              </td>
              <td className="px-4 py-3">{v.cargo}</td>
              <td className="px-4 py-3 text-slate-500">{v.areas?.nombre}</td>
              <td className="px-4 py-3"><Badge texto={ESTADO_VACANTE_LABELS[v.estado]} valor={v.estado} /></td>
              <td className="px-4 py-3 text-slate-500">{diasDesde(v.created_at)}</td>
              <td className="px-4 py-3 text-slate-500">{v.postulantes}</td>
            </tr>
          ))}
          {!cargando && !visibles.length && (
            <TableEmpty colSpan={6}>No hay vacantes que coincidan con el filtro</TableEmpty>
          )}
        </tbody>
      </TableShell>

      {totalPaginas > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1 text-sm">
          <button disabled={pagina2 === 1} onClick={() => setPagina(pagina2 - 1)}
            className="rounded px-2 py-1 disabled:opacity-30">‹</button>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setPagina(n)}
              className={`h-7 w-7 rounded ${n === pagina2 ? 'bg-brand text-white' : 'hover:bg-slate-200'}`}>{n}</button>
          ))}
          <button disabled={pagina2 === totalPaginas} onClick={() => setPagina(pagina2 + 1)}
            className="rounded px-2 py-1 disabled:opacity-30">›</button>
        </div>
      )}
    </div>
  )
}
