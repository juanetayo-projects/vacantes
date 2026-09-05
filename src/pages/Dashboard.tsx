import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Users, CalendarClock, UserCheck } from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis,
  BarChart, Bar, CartesianGrid,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth, ROLE_LABELS } from '../lib/auth'
import { MetricCard, Card, Badge } from '../components/ui'
import { ESTADO_VACANTE_LABELS, URGENCIA_LABELS, diasDesde } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Vacante = Tables<'vacantes'> & { areas: { nombre: string } | null }

const DONUT_COLORS = ['#2ECC71', '#3498DB', '#0D2D6B', '#F39C12', '#94a3b8']

export default function Dashboard() {
  const { perfil } = useAuth()
  const [vacantes, setVacantes] = useState<Vacante[]>([])
  const [candidatosEnProceso, setCandidatosEnProceso] = useState(0)
  const [entrevistasHoy, setEntrevistasHoy] = useState(0)
  const [contratacionesMes, setContratacionesMes] = useState(0)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      const [{ data: vac }, { count: postCount }, { count: entCount }, { count: contCount }] = await Promise.all([
        supabase.from('vacantes').select('*, areas(nombre)').order('created_at', { ascending: false }),
        supabase.from('postulaciones').select('id', { count: 'exact', head: true })
          .in('estado', ['postulado', 'preseleccionado', 'entrevista', 'finalista']),
        supabase.from('entrevistas').select('id', { count: 'exact', head: true })
          .gte('fecha', new Date().toISOString().slice(0, 10)),
        supabase.from('postulaciones').select('id', { count: 'exact', head: true })
          .eq('estado', 'seleccionado')
          .gte('updated_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ])
      setVacantes((vac as Vacante[]) ?? [])
      setCandidatosEnProceso(postCount ?? 0)
      setEntrevistasHoy(entCount ?? 0)
      setContratacionesMes(contCount ?? 0)
      setCargando(false)
    }
    cargar()
  }, [])

  const activas = vacantes.filter((v) => !['cerrada', 'cancelada'].includes(v.estado))

  const donutData = useMemo(() => {
    const grupos: Record<string, number> = {
      Aprobadas: 0, 'En Proceso': 0, Publicadas: 0, 'En Evaluación': 0, Cerradas: 0,
    }
    for (const v of vacantes) {
      if (v.estado === 'aprobada') grupos['Aprobadas']++
      else if (['pendiente_aprobacion', 'en_requisicion'].includes(v.estado)) grupos['En Proceso']++
      else if (v.estado === 'publicada') grupos['Publicadas']++
      else if (['en_evaluacion', 'en_oferta'].includes(v.estado)) grupos['En Evaluación']++
      else if (['cerrada', 'contratada'].includes(v.estado)) grupos['Cerradas']++
    }
    return Object.entries(grupos).map(([name, value]) => ({ name, value })).filter((d) => d.value > 0)
  }, [vacantes])

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
    const cerradas = vacantes.filter((v) => v.estado === 'contratada' && v.fecha_cierre)
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
  }, [vacantes])

  const criticas = activas
    .filter((v) => v.nivel_urgencia === 'alto' || v.nivel_urgencia === 'critico')
    .sort((a, b) => diasDesde(b.created_at) - diasDesde(a.created_at))
    .slice(0, 6)

  const tiempoPromedio = useMemo(() => {
    const contratadas = vacantes.filter((v) => v.estado === 'contratada' && v.fecha_cierre)
    if (!contratadas.length) return null
    const total = contratadas.reduce((acc, v) => acc + (diasDesde(v.created_at) - diasDesde(v.fecha_cierre)), 0)
    return Math.round(total / contratadas.length)
  }, [vacantes])

  if (cargando) return <div className="text-slate-500">Cargando dashboard…</div>

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-[#0D2D6B]">¡Bienvenido, {perfil?.nombre?.split(' ')[0]}!</h1>
        <p className="text-sm text-slate-500">{perfil ? ROLE_LABELS[perfil.role] : ''}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard titulo="Vacantes Activas" valor={activas.length} icono={<Briefcase size={18} />} />
        <MetricCard titulo="Candidatos en Proceso" valor={candidatosEnProceso} icono={<Users size={18} />} />
        <MetricCard titulo="Entrevistas Hoy" valor={entrevistasHoy} icono={<CalendarClock size={18} />} />
        <MetricCard titulo="Contrataciones Mes" valor={contratacionesMes} icono={<UserCheck size={18} />} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Estado de Vacantes</h2>
          {donutData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="py-8 text-center text-sm text-slate-400">Sin datos aún</p>}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
            {donutData.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Tiempo Promedio de Cobertura {tiempoPromedio != null && <span className="text-[#0D2D6B]">· {tiempoPromedio} días</span>}
          </h2>
          {tiempoCobertura.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={tiempoCobertura}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="dias" stroke="#16468E" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="py-8 text-center text-sm text-slate-400">Aún no hay vacantes contratadas para calcular tendencia</p>}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Vacantes por Área</h2>
          {porArea.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porArea} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="area" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#0D2D6B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="py-8 text-center text-sm text-slate-400">Sin datos aún</p>}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Vacantes Críticas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr><th className="pb-2">Vacante</th><th className="pb-2">Área</th><th className="pb-2">Urgencia</th><th className="pb-2">Días</th></tr>
              </thead>
              <tbody>
                {criticas.map((v) => (
                  <tr key={v.id} className="border-t border-slate-100">
                    <td className="py-2">
                      <Link to={`/vacantes/${v.id}/aprobacion`} className="font-medium text-[#16468E] hover:underline">{v.cargo}</Link>
                    </td>
                    <td className="py-2 text-slate-500">{v.areas?.nombre}</td>
                    <td className="py-2"><Badge texto={URGENCIA_LABELS[v.nivel_urgencia]} valor={v.nivel_urgencia} /></td>
                    <td className="py-2 text-slate-500">{diasDesde(v.created_at)}</td>
                  </tr>
                ))}
                {!criticas.length && (
                  <tr><td colSpan={4} className="py-6 text-center text-slate-400">Sin vacantes críticas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
