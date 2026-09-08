import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Card, Badge, Boton, Modal, Textarea, TableShell, TableHead, TableEmpty, filaZebra } from '../components/ui'
import { useAlert } from '../lib/alerts'
import { crearNotificacion } from '../lib/notificaciones'
import { ESTADO_POSTULACION_LABELS, formatoFecha } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Postulacion = Tables<'postulaciones'> & { candidatos: Tables<'candidatos'> }
type Evaluacion = Tables<'evaluacion_competencias'>
type Entrevista = Tables<'entrevistas'>
type Documento = Tables<'documentos_postulacion'>

const RESOLVIBLES = new Set(['finalista'])

export default function SeleccionFinalistas() {
  const { id } = useParams()
  const idNum = Number(id)
  const { perfil } = useAuth()
  const { confirm, notify } = useAlert()
  const [vacante, setVacante] = useState<Tables<'vacantes'> | null>(null)
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([])
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [modalGanador, setModalGanador] = useState<Postulacion | null>(null)
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    const [{ data: v }, { data: post }] = await Promise.all([
      supabase.from('vacantes').select('*').eq('id', idNum).single(),
      supabase.from('postulaciones').select('*, candidatos(*)')
        .eq('vacante_id', idNum)
        .in('estado', ['finalista', 'seleccionado', 'no_seleccionado'])
        .order('fecha_postulacion'),
    ])
    setVacante(v)
    setPostulaciones((post as any) ?? [])
    const ids = (post ?? []).map((p) => p.id)
    if (ids.length) {
      const [{ data: ev }, { data: ent }, { data: docs }] = await Promise.all([
        supabase.from('evaluacion_competencias').select('*').in('postulacion_id', ids),
        supabase.from('entrevistas').select('*').in('postulacion_id', ids).order('fecha'),
        supabase.from('documentos_postulacion').select('*').in('postulacion_id', ids),
      ])
      setEvaluaciones(ev ?? [])
      setEntrevistas(ent ?? [])
      setDocumentos(docs ?? [])
    } else {
      setEvaluaciones([]); setEntrevistas([]); setDocumentos([])
    }
  }

  useEffect(() => { cargar() }, [id])

  const filas = useMemo(() => postulaciones.map((p) => {
    const evs = evaluaciones.filter((e) => e.postulacion_id === p.id)
    const pesoTotal = evs.reduce((a, e) => a + Number(e.peso), 0)
    const puntaje = pesoTotal
      ? Math.round((evs.reduce((a, e) => a + (Number(e.promedio ?? 0) * Number(e.peso)), 0) / pesoTotal) * 20) / 20
      : null
    const entsCandidato = entrevistas.filter((e) => e.postulacion_id === p.id)
    const ultimaEntrevista = entsCandidato[entsCandidato.length - 1]
    const docsCandidato = documentos.filter((d) => d.postulacion_id === p.id)
    const docsValidados = docsCandidato.filter((d) => d.estado === 'validado').length
    return { postulacion: p, puntaje, entrevistas: entsCandidato.length, ultimaEntrevista, docsValidados, docsTotal: docsCandidato.length }
  }).sort((a, b) => (b.puntaje ?? -1) - (a.puntaje ?? -1)), [postulaciones, evaluaciones, entrevistas, documentos])

  const hayDecisionTomada = postulaciones.some((p) => p.estado === 'seleccionado' || p.estado === 'no_seleccionado')

  function abrirSeleccion(p: Postulacion) {
    setMotivo(`Se seleccionó a otro candidato para el cargo de ${vacante?.cargo ?? ''}.`)
    setModalGanador(p)
  }

  async function confirmarGanador() {
    if (!modalGanador || !perfil) return
    const otros = postulaciones.filter((p) => p.id !== modalGanador.id && RESOLVIBLES.has(p.estado))
    setGuardando(true)
    if (otros.length) {
      await supabase.from('postulaciones').update({
        estado: 'no_seleccionado', motivo_descarte: motivo || 'no_seleccionado', updated_at: new Date().toISOString(),
      }).in('id', otros.map((p) => p.id))
    }
    if (vacante) {
      const nombres = otros.map((p) => p.candidatos.nombre).join(', ')
      await crearNotificacion(vacante.solicitante_id, `Decisión registrada · ${vacante.cargo}`,
        otros.length
          ? `Se eligió a ${modalGanador.candidatos.nombre}. Quedaron no seleccionados: ${nombres}.`
          : `Se eligió a ${modalGanador.candidatos.nombre}.`,
        { tipo: 'success' })
    }
    setGuardando(false)
    setModalGanador(null)
    notify(otros.length ? `${modalGanador.candidatos.nombre} queda como elegido. Los demás finalistas se marcaron como No Seleccionados.` : 'Decisión registrada.', 'success')
    cargar()
  }

  return (
    <div>
      <PageHeader
        titulo={`Selección de Finalistas · ${vacante?.cargo ?? ''}`}
        subtitulo={vacante ? `${vacante.codigo} — compara a los finalistas y registra a quién se elige` : ''}
        acciones={<Link to={`/vacantes/${idNum}/candidatos`} className="flex items-center gap-1 text-sm text-brand-light hover:underline"><ArrowLeft size={14} /> Volver al Kanban</Link>}
      />

      <Card>
        <div className="overflow-x-auto">
          <TableShell>
            <TableHead>
              <th>Candidato</th><th>Puntaje</th><th>Entrevistas</th><th>Documentos</th><th>Estado</th><th />
            </TableHead>
            <tbody>
              {filas.map(({ postulacion: p, puntaje, entrevistas: numEnt, ultimaEntrevista, docsValidados, docsTotal }, i) => (
                <tr key={p.id} className={filaZebra(i)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">{p.candidatos.nombre}</p>
                    <p className="text-xs text-slate-400">{p.candidatos.formacion ?? p.candidatos.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {puntaje != null ? <span className="font-semibold text-brand">{puntaje.toFixed(1)} / 5.0</span> : <span className="text-slate-400">Sin evaluar</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {numEnt ? `${numEnt} · ${ultimaEntrevista?.resultado ?? 'sin resultado'}` : 'Sin entrevistas'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{docsTotal ? `${docsValidados}/${docsTotal} validados` : '-'}</td>
                  <td className="px-4 py-3"><Badge texto={ESTADO_POSTULACION_LABELS[p.estado]} valor={p.estado} /></td>
                  <td className="px-4 py-3 text-right">
                    {RESOLVIBLES.has(p.estado) && (
                      <Boton className="!px-3 !py-1.5 text-xs" onClick={() => abrirSeleccion(p)}>
                        <Trophy size={13} className="mr-1 inline" /> Seleccionar
                      </Boton>
                    )}
                  </td>
                </tr>
              ))}
              {!filas.length && <TableEmpty colSpan={6}>Esta vacante todavía no tiene finalistas</TableEmpty>}
            </tbody>
          </TableShell>
        </div>
        {hayDecisionTomada && (
          <p className="mt-3 text-xs text-slate-400">Esta vacante ya tiene una decisión registrada. Puedes seguir marcando otros finalistas si quedan pendientes.</p>
        )}
      </Card>

      <Modal open={!!modalGanador} onClose={() => setModalGanador(null)} titulo={`Elegir a ${modalGanador?.candidatos.nombre}`} ancho="max-w-md">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-600">
            Los demás finalistas de esta vacante quedarán marcados como <strong>No Seleccionados</strong> con el motivo que escribas abajo.
          </p>
          <Textarea label="Motivo (visible para Talento Humano)" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModalGanador(null)}>Cancelar</Boton>
            <Boton disabled={guardando} onClick={confirmarGanador}>{guardando ? 'Guardando…' : 'Confirmar Selección'}</Boton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
