import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Card, FilterBar, Boton, Input, Select, Badge, TableShell, TableHead, TableEmpty, filaZebra } from '../components/ui'
import { ESTADO_VACANTE_LABELS, ESTADO_POSTULACION_LABELS, formatoFecha } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Modo = 'candidatos' | 'evaluaciones' | 'contrataciones' | 'induccion'
type VacanteFila = Tables<'vacantes'> & { areas: { nombre: string } | null }
type PostulacionFila = Tables<'postulaciones'> & { candidatos: Tables<'candidatos'>; vacantes: Tables<'vacantes'> & { areas: { nombre: string } | null } }
type Convocatoria = Tables<'convocatorias_pendientes'> & {
  vacantes: { cargo: string; codigo: string } | null
  profiles: { nombre: string } | null
}

const ESTADOS_POR_MODO: Record<Exclude<Modo, 'candidatos'>, Tables<'postulaciones'>['estado'][]> = {
  evaluaciones: ['entrevista', 'finalista'],
  contrataciones: ['seleccionado'],
  induccion: ['seleccionado'],
}

const CONFIG: Record<Modo, { titulo: string; subtitulo: string }> = {
  candidatos: { titulo: 'Candidatos por Vacante', subtitulo: 'Selecciona una vacante para ver su tablero de candidatos' },
  evaluaciones: { titulo: 'Evaluaciones Pendientes', subtitulo: 'Candidatos en entrevista o finalistas' },
  contrataciones: { titulo: 'Contrataciones', subtitulo: 'Candidatos seleccionados listos para oferta' },
  induccion: { titulo: 'Inducción y Seguimiento', subtitulo: 'Colaboradores contratados en proceso de inducción' },
}

export default function ListaCandidatos({ modo = 'candidatos' }: { modo?: Modo }) {
  const { perfil } = useAuth()
  const [vacantes, setVacantes] = useState<VacanteFila[]>([])
  const [postulaciones, setPostulaciones] = useState<PostulacionFila[]>([])
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([])
  const [areas, setAreas] = useState<Tables<'areas'>[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  async function cargarConvocatorias() {
    const { data } = await supabase.from('convocatorias_pendientes')
      .select('*, vacantes(cargo, codigo), profiles!convocatorias_pendientes_abierta_por_fkey(nombre)')
      .neq('estado', 'cerrada').order('created_at')
    setConvocatorias((data as any) ?? [])
  }

  async function tomarConvocatoria(c: Convocatoria) {
    if (!perfil) return
    await supabase.from('convocatorias_pendientes').update({ estado: 'en_gestion', asignada_a: perfil.id }).eq('id', c.id)
    cargarConvocatorias()
  }

  async function cerrarConvocatoria(c: Convocatoria) {
    await supabase.from('convocatorias_pendientes').update({ estado: 'cerrada' }).eq('id', c.id)
    cargarConvocatorias()
  }

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setBusqueda(''); setFiltroArea(''); setFiltroEstado('')
      if (!areas.length) supabase.from('areas').select('*').order('nombre').then(({ data }) => setAreas(data ?? []))
      if (modo === 'candidatos') {
        const { data } = await supabase.from('vacantes').select('*, areas(nombre)')
          .in('estado', ['publicada', 'en_evaluacion']).order('created_at', { ascending: false })
        setVacantes((data as any) ?? [])
        cargarConvocatorias()
      } else {
        const { data } = await supabase.from('postulaciones').select('*, candidatos(*), vacantes(*, areas(nombre))')
          .in('estado', ESTADOS_POR_MODO[modo]).order('updated_at', { ascending: false })
        setPostulaciones((data as any) ?? [])
      }
      setCargando(false)
    }
    cargar()
  }, [modo])

  const vacantesFiltradas = useMemo(() => vacantes.filter((v) => {
    if (busqueda && !`${v.codigo} ${v.cargo}`.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (filtroArea && String(v.area_id) !== filtroArea) return false
    return true
  }), [vacantes, busqueda, filtroArea])

  const postulacionesFiltradas = useMemo(() => postulaciones.filter((p) => {
    if (busqueda && !`${p.candidatos.nombre} ${p.vacantes.cargo} ${p.vacantes.codigo}`.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (filtroArea && String(p.vacantes.area_id) !== filtroArea) return false
    if (filtroEstado && p.estado !== filtroEstado) return false
    return true
  }), [postulaciones, busqueda, filtroArea, filtroEstado])

  const { titulo, subtitulo } = CONFIG[modo]

  return (
    <div>
      <PageHeader titulo={titulo} subtitulo={subtitulo} />

      {modo === 'candidatos' && !!convocatorias.length && (
        <Card titulo="Convocatorias Externas Pendientes" className="mb-4">
          <div className="flex flex-col gap-2">
            {convocatorias.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Megaphone size={15} className="text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{c.vacantes?.cargo} · {c.vacantes?.codigo}</p>
                    <p className="text-xs text-slate-400">
                      Abierta por {c.profiles?.nombre} · {formatoFecha(c.created_at)}
                      {c.estado === 'en_gestion' && ' · En gestión'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {c.estado === 'pendiente' && (
                    <Boton className="!px-3 !py-1.5 text-xs" onClick={() => tomarConvocatoria(c)}>Tomar</Boton>
                  )}
                  <Boton variante="secundario" className="!px-3 !py-1.5 text-xs" onClick={() => cerrarConvocatoria(c)}>Cerrar</Boton>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <FilterBar>
        <Input label={modo === 'candidatos' ? 'Buscar vacante o código' : 'Buscar candidato o vacante'}
          placeholder={modo === 'candidatos' ? 'VAC-2026-024, Médico…' : 'Nombre, cargo, código…'}
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-64" />
        <Select label="Área" value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </Select>
        {modo === 'evaluaciones' && (
          <Select label="Estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS_POR_MODO.evaluaciones.map((e) => <option key={e} value={e}>{ESTADO_POSTULACION_LABELS[e]}</option>)}
          </Select>
        )}
      </FilterBar>

      {modo === 'candidatos' ? (
        <TableShell>
          <TableHead>
            <th>Código</th><th>Cargo</th><th>Área</th><th>Estado</th><th>Publicada</th>
          </TableHead>
          <tbody>
            {vacantesFiltradas.map((v, i) => (
              <tr key={v.id} className={filaZebra(i)}>
                <td className="px-4 py-3">
                  <Link to={`/vacantes/${v.id}/candidatos`} className="font-medium text-brand-light hover:underline">{v.codigo}</Link>
                </td>
                <td className="px-4 py-3">{v.cargo}</td>
                <td className="px-4 py-3 text-slate-500">{v.areas?.nombre}</td>
                <td className="px-4 py-3"><Badge texto={ESTADO_VACANTE_LABELS[v.estado]} valor={v.estado} /></td>
                <td className="px-4 py-3 text-slate-500">{formatoFecha(v.fecha_publicacion)}</td>
              </tr>
            ))}
            {!cargando && !vacantesFiltradas.length && <TableEmpty colSpan={5}>No hay vacantes que coincidan con el filtro</TableEmpty>}
          </tbody>
        </TableShell>
      ) : (
        <TableShell>
          <TableHead>
            <th>Candidato</th><th>Vacante</th><th>Estado</th><th />
          </TableHead>
          <tbody>
            {postulacionesFiltradas.map((p, i) => (
              <tr key={p.id} className={filaZebra(i)}>
                <td className="px-4 py-3 font-medium text-slate-700">{p.candidatos.nombre}</td>
                <td className="px-4 py-3 text-slate-500">{p.vacantes.cargo} · {p.vacantes.codigo}</td>
                <td className="px-4 py-3"><Badge texto={ESTADO_POSTULACION_LABELS[p.estado]} valor={p.estado} /></td>
                <td className="px-4 py-3 text-right">
                  <Link className="text-xs font-medium text-brand-light hover:underline"
                    to={modo === 'evaluaciones' ? `/postulaciones/${p.id}/evaluacion`
                      : modo === 'contrataciones' ? `/postulaciones/${p.id}/contratacion`
                      : `/postulaciones/${p.id}/induccion`}>
                    Abrir →
                  </Link>
                </td>
              </tr>
            ))}
            {!cargando && !postulacionesFiltradas.length && <TableEmpty colSpan={4}>No hay candidatos que coincidan con el filtro</TableEmpty>}
          </tbody>
        </TableShell>
      )}
    </div>
  )
}
