import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Badge, TableShell, TableHead, TableEmpty, filaZebra } from '../components/ui'
import { ESTADO_VACANTE_LABELS, formatoFecha } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Fila = Tables<'vacantes'> & { areas: { nombre: string } | null }

const ESTADOS_RESPONDIDAS = ['aprobada', 'rechazada', 'borrador'] as const

export default function Solicitudes() {
  const { perfil } = useAuth()
  const esAprobador = perfil?.role === 'admin' || !!perfil?.perm_aprobaciones
  const [tab, setTab] = useState<'pendientes' | 'mias' | 'respondidas'>(esAprobador ? 'pendientes' : 'mias')
  const [vacantes, setVacantes] = useState<Fila[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      if (!perfil) return
      setCargando(true)
      let q = supabase.from('vacantes').select('*, areas(nombre)').order('created_at', { ascending: false })
      if (tab === 'pendientes') q = q.eq('estado', 'pendiente_aprobacion')
      else if (tab === 'mias') q = q.eq('solicitante_id', perfil.id).eq('estado', 'pendiente_aprobacion')
      else q = q.eq('solicitante_id', perfil.id).in('estado', ESTADOS_RESPONDIDAS)
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
        {(esAprobador ? (['pendientes', 'mias', 'respondidas'] as const) : (['mias', 'respondidas'] as const)).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-brand text-brand' : 'text-slate-500'}`}>
            {t === 'pendientes' ? 'Pendientes de Aprobación' : t === 'mias' ? 'Mis Solicitudes' : 'Respondidas por TTHH'}
          </button>
        ))}
      </div>

      <TableShell>
        <TableHead>
          <th>Código</th><th>Cargo</th><th>Área</th><th>Estado</th><th>Fecha Solicitud</th>
        </TableHead>
        <tbody>
          {vacantes.map((v, i) => (
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
          {!cargando && !vacantes.length && <TableEmpty colSpan={5}>No hay solicitudes para mostrar</TableEmpty>}
        </tbody>
      </TableShell>
    </div>
  )
}
