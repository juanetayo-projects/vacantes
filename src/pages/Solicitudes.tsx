import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Badge } from '../components/ui'
import { ESTADO_VACANTE_LABELS, formatoFecha } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Fila = Tables<'vacantes'> & { areas: { nombre: string } | null }

export default function Solicitudes() {
  const { perfil } = useAuth()
  const [tab, setTab] = useState<'pendientes' | 'mias'>('pendientes')
  const [vacantes, setVacantes] = useState<Fila[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      let q = supabase.from('vacantes').select('*, areas(nombre)').order('created_at', { ascending: false })
      if (tab === 'pendientes') q = q.eq('estado', 'pendiente_aprobacion')
      else if (perfil) q = q.eq('solicitante_id', perfil.id)
      const { data } = await q
      setVacantes((data as Fila[]) ?? [])
      setCargando(false)
    }
    cargar()
  }, [tab, perfil])

  return (
    <div>
      <PageHeader titulo="Solicitudes de Vacante" subtitulo="Bandeja de aprobación y solicitudes propias" />

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {(['pendientes', 'mias'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-[#0D2D6B] text-[#0D2D6B]' : 'text-slate-500'}`}>
            {t === 'pendientes' ? 'Pendientes de Aprobación' : 'Mis Solicitudes'}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Área</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha Solicitud</th>
            </tr>
          </thead>
          <tbody>
            {vacantes.map((v) => (
              <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/vacantes/${v.id}/aprobacion`} className="font-medium text-[#16468E] hover:underline">{v.codigo}</Link>
                </td>
                <td className="px-4 py-3">{v.cargo}</td>
                <td className="px-4 py-3 text-slate-500">{v.areas?.nombre}</td>
                <td className="px-4 py-3"><Badge texto={ESTADO_VACANTE_LABELS[v.estado]} valor={v.estado} /></td>
                <td className="px-4 py-3 text-slate-500">{formatoFecha(v.created_at)}</td>
              </tr>
            ))}
            {!cargando && !vacantes.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No hay solicitudes para mostrar</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
