import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Users, CalendarClock, UserCheck } from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis,
  BarChart, Bar, CartesianGrid,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth, ROLE_LABELS } from '../lib/auth'
import { MetricCard, Card, Badge, TableHead, TableEmpty, filaZebra, tooltipOscuroProps } from '../components/ui'
import { MiniCalendario, type EventoCalendario } from '../components/MiniCalendario'
import { ESTADO_VACANTE_LABELS, URGENCIA_LABELS, diasDesde } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Vacante = Tables<'vacantes'> & { areas: { nombre: string } | null }
type EntrevistaFila = Tables<'entrevistas'> & { postulaciones: { candidatos: { nombre: string } | null; vacantes: { cargo: string } | null } | null }

// Paleta "Salud y Bienestar": turquesa, azul institucional, verde, ámbar, gris
const DONUT_COLORS = ['#009688', '#0D2D6B', '#4CAF50', '#F59E0B', '#94a3b8']
const NIVELES_URGENCIA = ['bajo', 'medio', 'alto', 'critico'] as const

export default function Dashboard() {
  const { perfil } = useAuth()
  const [vacantes, setVacantes] = useState<Vacante[]>([])
  const [areas, setAreas] = useState<Tables<'areas'>[]>([])
  const [entrevistas, setEntrevistas] = useState<EntrevistaFila[]>([])
  const [candidatosEnProceso, setCandidatosEnProceso] = useState(0)
  const [entrevistasHoy, setEntrevistasHoy] = useState(0)
  const [contratacionesMes, setContratacionesMes] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [filtroArea, setFiltroArea] = useState('')

  useEffect(() => {
    async function cargar() {
      const [{ data: vac }, { data: ar }, { data: ent }, { count: postCount }, { count: entCount }, { count: contCount }] = await Promise.all([
        supabase.from('vacantes').select('*, areas(nombre)').order('created_at', { ascending: false }),
        supabase.from('areas').select('*').order('nombre'),
        supabase.from('entrevistas').select('*, postulaciones(candidatos(nombre), vacantes(cargo))').order('fecha'),
        supabase.from('postulaciones').select('id', { count: 'exact', head: true })
          .in('estado', ['postulado', 'preseleccionado', 'entrevista', 'finalista']),
        supabase.from('entrevistas').select('id', { count: 'exact', head: true })
          .gte('fecha', new Date().toISOString().slice(0, 10)),
        supabase.from('postulaciones').select('id', { count: 'exact', head: true })
          .eq('estado', 'seleccionado')
          .gte('updated_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ])
      setVacantes((vac as Vacante[]) ?? [])
      setAreas(ar ?? [])
      setEntrevistas((ent as any) ?? [])
      setCandidatosEnProceso(postCount ?? 0)
      setEntrevistasHoy(entCount ?? 0)
      setContratacionesMes(contCount ?? 0)
      setCargando(false)
    }
    cargar()
  }, [])

  const vacantesFiltradas = useMemo(
    () => filtroArea ? vacantes.filter((v) => String(v.area_id) === filtroArea) : vacantes,
    [vacantes, filtroArea]
  )
  const activas = vacantesFiltradas.filter((v) => !['cerrada', 'cancelada'].includes(v.estado))

  const eventosCalendario: EventoCalendario[] = useMemo(() => entrevistas
    .filter((e) => e.fecha)
    .map((e) => ({
      fecha: e.fecha!,
      label: e.postulaciones?.candidatos?.nombre ?? 'Entrevista',
      sub: e.postulaciones?.vacantes?.cargo,
    })), [entrevistas])

  const heatmapData = useMemo(() => {
    const areasConDatos = areas.length ? areas.map((a) => a.nombre) : Array.from(new Set(vacantesFiltradas.map((v) => v.areas?.nombre ?? '—')))
    const grid: Record<string, Record<string, number>> = {}
    for (const nombreArea of areasConDatos) grid[nombreArea] = { bajo: 0, medio: 0, alto: 0, critico: 0 }
    for (const v of activas) {
      const nombreArea = v.areas?.nombre ?? '—'
      if (!grid[nombreArea]) grid[nombreArea] = { bajo: 0, medio: 0, alto: 0, critico: 0 }
      grid[nombreArea][v.nivel_urgencia]++
    }
    const max = Math.max(1, ...Object.values(grid).flatMap((r) => Object.values(r)))
    return { filas: Object.entries(grid).filter(([, v]) => Object.values(v).some((n) => n > 0)), max }
  }, [activas, areas, vacantesFiltradas])

  function colorCelda(valor: number, max: number) {
    if (!valor) return 'transparent'
    const intensidad = 0.15 + (valor / max) * 0.75
    return `rgba(0, 150, 136, ${intensidad})`
  }

  const donutData = useMemo(() => {
    const grupos: Record<string, number> = {
      Aprobadas: 0, 'En Proceso': 0, Publicadas: 0, 'En Evaluación': 0, Cerradas: 0,
    }
    for (const v of vacantesFiltradas) {
      if (v.estado === 'aprobada') grupos['Aprobadas']++
      else if (['pendiente_aprobacion', 'en_requisicion'].includes(v.estado)) grupos['En Proceso']++
      else if (v.estado === 'publicada') grupos['Publicadas']++
      else if (['en_evaluacion', 'en_oferta'].includes(v.estado)) grupos['En Evaluación']++
      else if (['cerrada', 'contratada'].includes(v.estado)) grupos['Cerradas']++
    }
    return Object.entries(grupos).map(([name, value]) => ({ name, value })).filter((d) => d.value > 0)
  }, [vacantesFiltradas])

  const porArea = useMemo(() => {
    const grupos: Record<string, number> = {}
    for (const v of activas) {
      const nombre = v.areas?.nombre ?? '—'
      grupos[nombre] = (grupos[nombre] ?? 0) + 1
    }
    return Object.entries(grupos).map(([area, cantidad]) => ({ area, cantidad })).sort((a, b) => b.cantidad - a.cantidad)
  }, [activas])

  const tiempoCobertura = useMemo(() => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const cerradas = vacantesFiltradas.filter((v) => v.estado === 'contratada' && v.fecha_cierre)
    const porMes: Record<string, number[]> = {}
    for (const v of cerradas) {
      const mes = meses[new Date(v.fecha_cierre!).getMonth()]
      const dias = diasDesde(v.created_at) - diasDesde(v.fecha_cierre)
      porMes[mes] = porMes[mes] ?? []
      porMes[mes].push(dias)
    }
    return meses.map((mes) => ({
      mes,
      dias: porMes[mes]?.length ? Math.round(porMes[mes].reduce((a, b) => a + b, 0) / porMes[mes].length) : null,
    })).filter((d) => d.dias !== null)
  }, [vacantesFiltradas])

  const criticas = activas
    .filter((v) => v.nivel_urgencia === 'alto' || v.nivel_urgencia === 'critico')
    .sort((a, b) => diasDesde(b.created_at) - diasDesde(a.created_at))
    .slice(0, 6)

  const tiempoPromedio = useMemo(() => {
    const contratadas = vacantesFiltradas.filter((v) => v.estado === 'contratada' && v.fecha_cierre)
    if (!contratadas.length) return null
    const total = contratadas.reduce((acc, v) => acc + (diasDesde(v.created_at) - diasDesde(v.fecha_cierre)), 0)
    return Math.round(total / contratadas.length)
  }, [vacantesFiltradas])

  if (cargando) return <div className="text-slate-500">Cargando dashboard…</div>

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-brand">¡Bienvenido, {perfil?.nombre?.split(' ')[0]}!</h1>
          <p className="text-sm text-slate-500">{perfil ? ROLE_LABELS[perfil.role] : ''}</p>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-2 text-sm shadow-sm">
          <span className="text-slate-500">Área</span>
          <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-700 outline-none">
            <option value="">Todas</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard titulo="Vacantes Activas" valor={activas.length} icono={<Briefcase size={16} />} />
        <MetricCard titulo="Candidatos en Proceso" valor={candidatosEnProceso} icono={<Users size={16} />} />
        <MetricCard titulo="Entrevistas Hoy" valor={entrevistasHoy} icono={<CalendarClock size={16} />} />
        <MetricCard titulo="Contrataciones Mes" valor={contratacionesMes} icono={<UserCheck size={16} />} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card titulo="Estado de Vacantes">
          {donutData.length ? (
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={65} paddingAngle={2}>
                  {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip {...tooltipOscuroProps} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="py-6 text-center text-sm text-slate-400">Sin datos aún</p>}
          <div className="mt-1 flex flex-wrap gap-2.5 text-xs text-slate-600">
            {donutData.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </Card>

        <Card titulo={<>Tiempo Promedio de Cobertura {tiempoPromedio != null && <span className="font-normal text-slate-500">· {tiempoPromedio} días</span>}</>}>
          {tiempoCobertura.length ? (
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={tiempoCobertura}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip {...tooltipOscuroProps} />
                <Line type="monotone" dataKey="dias" stroke="#009688" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="py-6 text-center text-sm text-slate-400">Aún no hay vacantes contratadas para calcular tendencia</p>}
        </Card>

        <Card titulo="Vacantes por Área">
          {porArea.length ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={porArea} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="area" width={100} tick={{ fontSize: 12 }} />
                <Tooltip {...tooltipOscuroProps} />
                <Bar dataKey="cantidad" fill="#0D2D6B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="py-6 text-center text-sm text-slate-400">Sin datos aún</p>}
        </Card>

        <Card titulo="Vacantes Críticas">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <TableHead>
                <th>Vacante</th><th>Área</th><th>Urgencia</th><th>Días</th>
              </TableHead>
              <tbody>
                {criticas.map((v, i) => (
                  <tr key={v.id} className={filaZebra(i)}>
                    <td className="px-4 py-2">
                      <Link to={`/vacantes/${v.id}/aprobacion`} className="font-medium text-brand-light hover:underline">{v.cargo}</Link>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{v.areas?.nombre}</td>
                    <td className="px-4 py-2"><Badge texto={URGENCIA_LABELS[v.nivel_urgencia]} valor={v.nivel_urgencia} /></td>
                    <td className="px-4 py-2 text-slate-500">{diasDesde(v.created_at)}</td>
                  </tr>
                ))}
                {!criticas.length && <TableEmpty colSpan={4}>Sin vacantes críticas</TableEmpty>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card titulo="Mapa de Calor · Urgencia por Área" className="lg:col-span-2">
          {heatmapData.filas.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400">
                    <th className="pb-2 text-left font-medium">Área</th>
                    {NIVELES_URGENCIA.map((n) => <th key={n} className="pb-2 font-medium capitalize">{URGENCIA_LABELS[n]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.filas.map(([area, valores]) => (
                    <tr key={area}>
                      <td className="py-1 pr-3 text-xs font-medium text-slate-600">{area}</td>
                      {NIVELES_URGENCIA.map((n) => (
                        <td key={n} className="p-1">
                          <div className="flex h-8 items-center justify-center rounded-md text-xs font-semibold text-brand"
                            style={{ background: colorCelda(valores[n], heatmapData.max) }}>
                            {valores[n] > 0 ? valores[n] : ''}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="py-6 text-center text-sm text-slate-400">Sin vacantes activas para mostrar</p>}
        </Card>

        <Card titulo="Agenda de Entrevistas">
          <MiniCalendario eventos={eventosCalendario} />
        </Card>
      </div>
    </div>
  )
}
