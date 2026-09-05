import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader, Badge, TableShell, TableHead, TableEmpty, filaZebra } from '../components/ui'
import { ESTADO_VACANTE_LABELS, ESTADO_POSTULACION_LABELS, formatoFecha } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Modo = 'candidatos' | 'evaluaciones' | 'contrataciones' | 'induccion'
type VacanteFila = Tables<'vacantes'> & { areas: { nombre: string } | null }
type PostulacionFila = Tables<'postulaciones'> & { candidatos: Tables<'candidatos'>; vacantes: Tables<'vacantes'> }

const CONFIG: Record<Modo, { titulo: string; subtitulo: string }> = {
  candidatos: { titulo: 'Candidatos por Vacante', subtitulo: 'Selecciona una vacante para ver su tablero de candidatos' },
  evaluaciones: { titulo: 'Evaluaciones Pendientes', subtitulo: 'Candidatos en entrevista o finalistas' },
  contrataciones: { titulo: 'Contrataciones', subtitulo: 'Candidatos seleccionados listos para oferta' },
  induccion: { titulo: 'Inducción y Seguimiento', subtitulo: 'Colaboradores contratados en proceso de inducción' },
}

export default function ListaCandidatos({ modo = 'candidatos' }: { modo?: Modo }) {
  const [vacantes, setVacantes] = useState<VacanteFila[]>([])
  const [postulaciones, setPostulaciones] = useState<PostulacionFila[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      if (modo === 'candidatos') {
        const { data } = await supabase.from('vacantes').select('*, areas(nombre)')
          .in('estado', ['publicada', 'en_evaluacion']).order('created_at', { ascending: false })
        setVacantes((data as any) ?? [])
      } else {
        const estados: Tables<'postulaciones'>['estado'][] = modo === 'evaluaciones' ? ['entrevista', 'finalista']
          : modo === 'contrataciones' ? ['seleccionado'] : ['seleccionado']
        const { data } = await supabase.from('postulaciones').select('*, candidatos(*), vacantes(*)')
          .in('estado', estados).order('updated_at', { ascending: false })
        setPostulaciones((data as any) ?? [])
      }
      setCargando(false)
    }
    cargar()
  }, [modo])

  const { titulo, subtitulo } = CONFIG[modo]

  return (
    <div>
      <PageHeader titulo={titulo} subtitulo={subtitulo} />

      {modo === 'candidatos' ? (
        <TableShell>
          <TableHead>
            <th>Código</th><th>Cargo</th><th>Área</th><th>Estado</th><th>Publicada</th>
          </TableHead>
          <tbody>
            {vacantes.map((v, i) => (
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
            {!cargando && !vacantes.length && <TableEmpty colSpan={5}>No hay vacantes en reclutamiento activo</TableEmpty>}
          </tbody>
        </TableShell>
      ) : (
        <TableShell>
          <TableHead>
            <th>Candidato</th><th>Vacante</th><th>Estado</th><th />
          </TableHead>
          <tbody>
            {postulaciones.map((p, i) => (
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
            {!cargando && !postulaciones.length && <TableEmpty colSpan={4}>No hay candidatos en esta etapa</TableEmpty>}
          </tbody>
        </TableShell>
      )}
    </div>
  )
}
