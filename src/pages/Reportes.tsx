import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, FileText } from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { PageHeader, Card, MetricCard, Boton, FilterBar, tooltipOscuroProps } from '../components/ui'
import { diasDesde } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Vacante = Tables<'vacantes'> & { areas: { nombre: string } | null }
// Paleta "Salud y Bienestar"
const FUENTE_COLORS = ['#009688', '#0D2D6B', '#4CAF50', '#F59E0B', '#94a3b8']
const FUENTE_LABELS: Record<string, string> = {
  portal_empleo: 'Portal de Empleo', referido: 'Referidos', linkedin: 'LinkedIn', pagina_web: 'Página Web', otros: 'Otros',
}

export default function Reportes() {
  const [tab, setTab] = useState<'dashboard' | 'cobertura' | 'fuentes' | 'tiempo' | 'eficiencia'>('dashboard')
  const [vacantes, setVacantes] = useState<Vacante[]>([])
  const [candidatos, setCandidatos] = useState<Tables<'candidatos'>[]>([])
  const [desde, setDesde] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10))
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    supabase.from('vacantes').select('*, areas(nombre)').then(({ data }) => setVacantes((data as any) ?? []))
    supabase.from('candidatos').select('*').then(({ data }) => setCandidatos(data ?? []))
  }, [])

  const enRango = vacantes.filter((v) => v.created_at >= desde && v.created_at <= hasta + 'T23:59:59')
  const cubiertas = enRango.filter((v) => v.estado === 'contratada')
  const tiempoPromedio = useMemo(() => {
    if (!cubiertas.length) return 0
    const total = cubiertas.reduce((a, v) => a + (diasDesde(v.created_at) - diasDesde(v.fecha_cierre)), 0)
    return Math.round(total / cubiertas.length)
  }, [cubiertas])
  const eficiencia = enRango.length ? Math.round((cubiertas.length / enRango.length) * 100) : 0

  const coberturaPorArea = useMemo(() => {
    const grupos: Record<string, number[]> = {}
    for (const v of cubiertas) {
      const area = v.areas?.nombre ?? '—'
      grupos[area] = grupos[area] ?? []
      grupos[area].push(diasDesde(v.created_at) - diasDesde(v.fecha_cierre))
    }
    return Object.entries(grupos).map(([area, dias]) => ({ area, dias: Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) }))
  }, [cubiertas])

  const fuentesData = useMemo(() => {
    const grupos: Record<string, number> = {}
    for (const c of candidatos) {
      const f = FUENTE_LABELS[c.fuente ?? 'otros']
      grupos[f] = (grupos[f] ?? 0) + 1
    }
    return Object.entries(grupos).map(([name, value]) => ({ name, value }))
  }, [candidatos])

  async function exportExcel() {
    const { exportarExcel } = await import('../lib/exportar')
    await exportarExcel('reporte_vacantes',
      [{ header: 'Código', key: 'codigo' }, { header: 'Cargo', key: 'cargo' }, { header: 'Área', key: 'area' },
       { header: 'Estado', key: 'estado' }, { header: 'Días', key: 'dias' }],
      enRango.map((v) => ({ codigo: v.codigo, cargo: v.cargo, area: v.areas?.nombre, estado: v.estado, dias: diasDesde(v.created_at) })))
  }

  async function exportPDF() {
    const { exportarPDF } = await import('../lib/exportar')
    exportarPDF('Reporte de Vacantes', ['Código', 'Cargo', 'Área', 'Estado', 'Días'],
      enRango.map((v) => [v.codigo, v.cargo, v.areas?.nombre ?? '', v.estado, diasDesde(v.created_at)]))
  }

  return (
    <div>
      <PageHeader titulo="Reportes y Analytics" acciones={
        <>
          <Boton variante="secundario" onClick={exportExcel}><FileSpreadsheet size={15} className="mr-1 inline" />Excel</Boton>
          <Boton variante="secundario" onClick={exportPDF}><FileText size={15} className="mr-1 inline" />PDF</Boton>
        </>
      } />

      <FilterBar>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium text-slate-600">Rango de Fechas</span>
          <div className="flex items-center gap-2">
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
            <span className="text-slate-400">–</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          </div>
        </label>
      </FilterBar>

      <div className="mb-4 flex gap-2 border-b border-slate-200 text-sm">
        {(['dashboard', 'cobertura', 'fuentes', 'tiempo', 'eficiencia'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 font-medium capitalize ${tab === t ? 'border-b-2 border-brand text-brand' : 'text-slate-500'}`}>{t}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard titulo="Vacantes Creadas" valor={enRango.length} />
        <MetricCard titulo="Vacantes Cubiertas" valor={cubiertas.length} />
        <MetricCard titulo="Tiempo Promedio" valor={`${tiempoPromedio} días`} />
        <MetricCard titulo="Eficiencia de Selección" valor={`${eficiencia}%`} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(tab === 'dashboard' || tab === 'cobertura' || tab === 'tiempo') && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Tiempo de Cobertura por Área</h2>
            {coberturaPorArea.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={coberturaPorArea}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="area" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip {...tooltipOscuroProps} />
                  <Bar dataKey="dias" fill="#009688" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="py-8 text-center text-sm text-slate-400">Sin vacantes cubiertas en el rango seleccionado</p>}
          </Card>
        )}

        {(tab === 'dashboard' || tab === 'fuentes') && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Fuentes de Reclutamiento</h2>
            {fuentesData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={fuentesData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {fuentesData.map((_, i) => <Cell key={i} fill={FUENTE_COLORS[i % FUENTE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipOscuroProps} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="py-8 text-center text-sm text-slate-400">Sin candidatos registrados aún</p>}
          </Card>
        )}
      </div>
    </div>
  )
}
