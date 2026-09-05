import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Clock, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Card, Badge, Boton, Modal, Textarea } from '../components/ui'
import { ESTADO_VACANTE_LABELS, formatoFecha } from '../lib/data'
import { crearNotificacion } from '../lib/notificaciones'
import type { Tables } from '../lib/database.types'

type Aprobacion = Tables<'aprobaciones'> & { profiles: { nombre: string } | null }
type Vacante = Tables<'vacantes'> & { areas: { nombre: string } | null; profiles: { nombre: string } | null }

export default function VacanteAprobacion() {
  const { id } = useParams()
  const idNum = Number(id)
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [vacante, setVacante] = useState<Vacante | null>(null)
  const [aprobaciones, setAprobaciones] = useState<Aprobacion[]>([])
  const [modal, setModal] = useState<{ aprobacion: Aprobacion; decision: 'aprobado' | 'rechazado' | 'modificacion_solicitada' } | null>(null)
  const [comentario, setComentario] = useState('')
  const [procesando, setProcesando] = useState(false)

  async function cargar() {
    const [{ data: v }, { data: aps }] = await Promise.all([
      supabase.from('vacantes').select('*, areas(nombre), profiles!vacantes_solicitante_id_fkey(nombre)').eq('id', idNum).single(),
      supabase.from('aprobaciones').select('*, profiles(nombre)').eq('vacante_id', idNum).order('orden'),
    ])
    setVacante(v as any)
    setAprobaciones((aps as any) ?? [])
  }

  useEffect(() => { cargar() }, [id])

  const puedeDecidir = perfil && (perfil.role === 'admin' || perfil.perm_aprobaciones)
  const indiceActual = aprobaciones.findIndex((a) => a.estado === 'pendiente')

  async function confirmarDecision() {
    if (!modal || !perfil) return
    if (modal.decision !== 'aprobado' && !comentario.trim()) return
    setProcesando(true)
    await supabase.from('aprobaciones').update({
      estado: modal.decision,
      comentarios: comentario || null,
      aprobador_id: perfil.id,
      fecha_decision: new Date().toISOString(),
    }).eq('id', modal.aprobacion.id)

    if (modal.decision === 'rechazado') {
      await supabase.from('vacantes').update({ estado: 'rechazada' }).eq('id', idNum)
      if (vacante) await crearNotificacion(vacante.solicitante_id,
        `Solicitud ${vacante.codigo} rechazada`,
        comentario || 'Tu solicitud fue rechazada.', { tipo: 'error', referenciaTabla: 'vacantes', referenciaId: idNum })
    } else if (modal.decision === 'modificacion_solicitada') {
      await supabase.from('vacantes').update({ estado: 'borrador' }).eq('id', idNum)
      if (vacante) await crearNotificacion(vacante.solicitante_id,
        `Solicitud ${vacante.codigo}: se pidió modificación`,
        comentario || 'Corrige tu solicitud y reenvíala.', { tipo: 'warning', referenciaTabla: 'vacantes', referenciaId: idNum })
    } else {
      const esUltimo = modal.aprobacion.orden === Math.max(...aprobaciones.map((a) => a.orden))
      if (esUltimo) {
        await supabase.from('vacantes').update({ estado: 'aprobada' }).eq('id', idNum)
        if (vacante) await crearNotificacion(vacante.solicitante_id,
          `Solicitud ${vacante.codigo} aprobada`,
          'Tu solicitud completó el flujo de aprobación.', { tipo: 'success', referenciaTabla: 'vacantes', referenciaId: idNum })
      }
    }

    await supabase.from('historial_estados').insert({
      entidad_tipo: 'vacante', entidad_id: idNum,
      estado_anterior: vacante?.estado, estado_nuevo: modal.decision,
      usuario_id: perfil.id, comentario: comentario || null,
    })

    setModal(null); setComentario(''); setProcesando(false)
    cargar()
  }

  if (!vacante) return <div className="text-slate-500">Cargando…</div>

  return (
    <div>
      <PageHeader titulo={`Aprobación de Solicitud #${vacante.codigo}`}
        subtitulo={`${vacante.cargo} · ${vacante.areas?.nombre}`}
        acciones={<Badge texto={ESTADO_VACANTE_LABELS[vacante.estado]} valor={vacante.estado} />} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h3 className="mb-3 text-sm font-semibold text-slate-600">Datos de la Solicitud</h3>
          <dl className="flex flex-col gap-2 text-sm">
            <div><dt className="text-xs text-slate-400">Solicitado por</dt><dd>{vacante.profiles?.nombre}</dd></div>
            <div><dt className="text-xs text-slate-400">Fecha</dt><dd>{formatoFecha(vacante.created_at)}</dd></div>
            <div><dt className="text-xs text-slate-400">Justificación</dt><dd className="text-slate-600">{vacante.justificacion}</dd></div>
          </dl>
          {vacante.estado === 'aprobada' && (
            <Boton className="mt-4 w-full" onClick={() => navigate(`/requisiciones?vacante=${vacante.id}`)}>
              Continuar con Requisición
            </Boton>
          )}
          {(vacante.estado === 'borrador' || vacante.estado === 'rechazada') && (
            <Boton className="mt-4 w-full" variante="secundario" onClick={() => navigate(`/vacantes/${vacante.id}/editar`)}>
              Editar y Reenviar
            </Boton>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-slate-600">Flujo de Aprobación</h3>
          <ol className="relative flex flex-col gap-6 border-l-2 border-slate-200 pl-6">
            {aprobaciones.map((a, i) => {
              const icono = a.estado === 'aprobado' ? <Check size={14} /> : a.estado === 'rechazado' ? <X size={14} />
                : a.estado === 'modificacion_solicitada' ? <AlertTriangle size={14} /> : <Clock size={14} />
              const color = a.estado === 'aprobado' ? 'bg-emerald-500' : a.estado === 'rechazado' ? 'bg-red-500'
                : a.estado === 'modificacion_solicitada' ? 'bg-orange-500' : i === indiceActual ? 'bg-brand-light' : 'bg-slate-300'
              return (
                <li key={a.id} className="relative">
                  <span className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full text-white ${color}`}>{icono}</span>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">{a.nombre_nivel}</p>
                    <Badge texto={a.estado.replace('_', ' ')} valor={a.estado} />
                  </div>
                  {a.profiles?.nombre && <p className="text-xs text-slate-400">{a.profiles.nombre} · {formatoFecha(a.fecha_decision)}</p>}
                  {a.comentarios && <p className="mt-1 rounded bg-slate-50 p-2 text-xs text-slate-600">{a.comentarios}</p>}
                  {i === indiceActual && puedeDecidir && (
                    <div className="mt-2 flex gap-2">
                      <Boton variante="exito" className="!px-3 !py-1.5 text-xs" onClick={() => setModal({ aprobacion: a, decision: 'aprobado' })}>Aprobar</Boton>
                      <Boton variante="peligro" className="!px-3 !py-1.5 text-xs" onClick={() => setModal({ aprobacion: a, decision: 'rechazado' })}>Rechazar</Boton>
                      <Boton variante="secundario" className="!px-3 !py-1.5 text-xs" onClick={() => setModal({ aprobacion: a, decision: 'modificacion_solicitada' })}>Solicitar Modificación</Boton>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </Card>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} titulo="Confirmar decisión">
        <p className="mb-3 text-sm text-slate-600">
          {modal?.decision === 'aprobado' ? 'Vas a aprobar este nivel de la solicitud.' : 'Los comentarios son obligatorios para esta decisión.'}
        </p>
        <Textarea label="Comentarios" rows={4} value={comentario} onChange={(e) => setComentario(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <Boton variante="secundario" onClick={() => setModal(null)}>Cancelar</Boton>
          <Boton disabled={procesando} onClick={confirmarDecision}>{procesando ? 'Guardando…' : 'Confirmar'}</Boton>
        </div>
      </Modal>
    </div>
  )
}
