import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, FilterBar, Input, Select, Badge, TableShell, TableHead, TableEmpty, filaZebra } from '../components/ui'
import { ESTADO_VACANTE_LABELS, formatoFecha } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Fila = Tables<'vacantes'> & { areas: { nombre: string } | null }

const ESTADOS_RESPONDIDAS = ['aprobada', 'rechazada', 'borrador'] as const

export default function Solicitudes() {
  const { perfil } = useAuth()
  const esAprobador = perfil?.role === 'admin' || !!perfil?.perm_aprobaciones
  const [tab, setTab] = useState<'pendientes' | 'mias' | 'respondidas'>(esAprobador ? 'pendientes' : 'mias')
  const [vacantes, setVacantes] = useState<Fila[]>([])
  const [areas, setAreas] = useState<Tables<'areas'>[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      if (!perfil) return
      setCargando(true)
      setBusqueda(''); setFiltroArea('')
      let q = supabase.from('vacantes').select('*, areas(nombre)').order('created_at', { ascending: false })
      if (tab === 'pendientes') q = q.eq('estado', 'pendiente_aprobacion')
      else if (tab === 'mias') q = q.eq('solicitante_id', perfil.id).eq('estado', 'pendiente_aprobacion')
      else q = q.eq('solicitante_id', perfil.id).in('estado', ESTADOS_RESPONDIDAS)
      const { data } = await q
      setVacantes((data as Fila[]) ?? [])
      setCargando(false)
    }
    cargar()
    if (!areas.length) supabase.from('areas').select('*').order('nombre').then(({ data }) => setAreas(data ?? []))
  }, [tab, perfil])

  const vacantesFiltradas = useMemo(() => vacantes.filter((v) => {
    if (busqueda && !`${v.codigo} ${v.cargo}`.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (filtroArea && String(v.area_id) !== filtroArea) return false
    return true
  }), [vacantes, busqueda, filtroArea])

  return (
    <div>
      <PageHeader titulo="Solicitudes de Vacante" subtitulo="Bandeja de aprobación y solicitudes propias" />

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {(esAprobador ? (['pendientes', 'mias', 'respondidas'] as const) : (['mias', 'respondidas'] as const)).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-brand text-brand' : 'text-slate-500'}`}>
            {t === 'pendientes' ? 'Pendientes de Aprobación' : t === 'mias' ? 'Mis Solicitudes' : 'Respondidas por TTHH'}
          </button>
        ))}
      </div>

      <FilterBar>
        <Input label="Buscar vacante o código" placeholder="VAC-2026-024, Médico…" value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)} className="w-64" />
        <Select label="Área" value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </Select>
      </FilterBar>

      <TableShell>
        <TableHead>
          <th>Código</th><th>Cargo</th><th>Área</th><th>Estado</th><th>Fecha Solicitud</th>
        </TableHead>
        <tbody>
          {vacantesFiltradas.map((v, i) => (
            <tr key={v.id} className={filaZebra(i)}>
              <td className="px-4 py-3">
                <Link to={`/vacantes/${v.id}/aprobacion`} className="font-medium text-brand-light hover:underline">{v.codigo}</Link>
              </td>
              <td className="px-4 py-3">{v.cargo}</td>
              <td className="px-4 py-3 text-slate-500">{v.areas?.nombre}</td>
              <td className="px-4 py-3"><Badge texto={ESTADO_VACANTE_LABELS[v.estado]} valor={v.estado} /></td>
              <td className="px-4 py-3 text-slate-500">{formatoFecha(v.created_at)}</td>
            </tr>
          ))}
          {!cargando && !vacantesFiltradas.length && <TableEmpty colSpan={5}>No hay solicitudes que coincidan con el filtro</TableEmpty>}
        </tbody>
      </TableShell>
    </div>
  )
}
