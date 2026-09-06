import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PageHeader, Boton, Badge, Input, Modal, TableShell, TableHead, TableEmpty, filaZebra } from '../components/ui'
import { useAlert } from '../lib/alerts'
import { crearNotificacion } from '../lib/notificaciones'
import { formatoFechaHora, bogotaISOString, datetimeLocalDesdeISO } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Cita = Tables<'citas_medicina_laboral'> & {
  postulaciones: Tables<'postulaciones'> & { candidatos: Tables<'candidatos'>; vacantes: Tables<'vacantes'> }
}

const ESTADO_LABELS: Record<string, string> = {
  programada: 'Por agendar', confirmada: 'Confirmada', rechazada_candidato: 'Rechazada por el candidato',
  no_respuesta: 'Sin respuesta', completada: 'Completada', cancelada: 'Cancelada',
}

export default function AgendaMedicinaLaboral() {
  const { confirm, notify } = useAlert()
  const [citas, setCitas] = useState<Cita[]>([])
  const [modalAgendar, setModalAgendar] = useState<Cita | null>(null)
  const [fechaHora, setFechaHora] = useState('')
  const [lugar, setLugar] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    const { data } = await supabase.from('citas_medicina_laboral')
      .select('*, postulaciones(*, candidatos(*), vacantes(*))')
      .not('estado', 'in', '(completada,cancelada)')
      .order('created_at')
    setCitas((data as any) ?? [])
  }

  useEffect(() => { cargar() }, [])

  function abrirAgendar(c: Cita) {
    setFechaHora(datetimeLocalDesdeISO(c.fecha_hora)); setLugar(c.lugar ?? '')
    setModalAgendar(c)
  }

  async function guardarAgenda() {
    if (!modalAgendar || !fechaHora) return
    setGuardando(true)
    const { data: sesion } = await supabase.auth.getSession()
    await supabase.from('citas_medicina_laboral').update({
      fecha_hora: bogotaISOString(fechaHora), lugar: lugar || null, agendado_por: sesion.session?.user.id, estado: 'programada',
    }).eq('id', modalAgendar.id)

    const email = modalAgendar.postulaciones.candidatos.email
    if (email) {
      const { data: tokenRow } = await supabase.from('candidato_tokens')
        .insert({ postulacion_id: modalAgendar.postulacion_id, tipo: 'medicina_laboral' }).select('token').single()
      if (tokenRow) {
        const { data, error } = await supabase.functions.invoke('notificar-candidato', {
          body: { postulacion_id: modalAgendar.postulacion_id, tipo: 'medicina_laboral', token: tokenRow.token },
          headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
        })
        if (error || data?.error) notify(`Se agendó, pero no se pudo enviar el correo: ${data?.error ?? error?.message}`, 'warning')
        else notify('Se notificó al candidato la cita de medicina laboral.', 'success')
      }
    } else {
      notify('Se agendó, pero el candidato no tiene correo registrado.', 'warning')
    }
    setGuardando(false); setModalAgendar(null)
    cargar()
  }

  async function marcarRechazado(c: Cita) {
    const ok = await confirm(
      `¿Marcar a ${c.postulaciones.candidatos.nombre} como rechazado por no respuesta a la cita de medicina laboral?`,
      { titulo: 'Rechazar por no respuesta', variante: 'peligro', textoConfirmar: 'Rechazar' },
    )
    if (!ok) return
    await supabase.from('citas_medicina_laboral').update({ estado: 'no_respuesta' }).eq('id', c.id)
    await supabase.from('postulaciones').update({ estado: 'descartado', motivo_descarte: 'no_respuesta_medicina_laboral' }).eq('id', c.postulacion_id)
    await crearNotificacion(c.postulaciones.vacantes.solicitante_id, `Candidato descartado · ${c.postulaciones.candidatos.nombre}`,
      'No respondió a la cita de medicina laboral y fue descartado del proceso.', { tipo: 'warning' })
    notify('Se marcó el registro como rechazado por no respuesta.', 'info')
    cargar()
  }

  function faltaMenosDe24h(c: Cita) {
    if (!c.fecha_hora || c.estado !== 'programada') return false
    return new Date(c.fecha_hora).getTime() - Date.now() < 24 * 3600 * 1000
  }

  return (
    <div>
      <PageHeader titulo="Agenda de Medicina Laboral" subtitulo="Programa y da seguimiento a las citas del médico laboral" />
      <TableShell>
        <TableHead><th>Candidato</th><th>Vacante</th><th>Fecha y Lugar</th><th>Estado</th><th /></TableHead>
        <tbody>
          {citas.map((c, i) => (
            <tr key={c.id} className={filaZebra(i)}>
              <td className="px-4 py-2.5">{c.postulaciones.candidatos.nombre}</td>
              <td className="px-4 py-2.5 text-slate-500">{c.postulaciones.vacantes.cargo}</td>
              <td className="px-4 py-2.5 text-slate-500">
                {c.fecha_hora ? `${formatoFechaHora(c.fecha_hora)} · ${c.lugar ?? '-'}` : 'Sin agendar'}
                {faltaMenosDe24h(c) && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-600"><AlertTriangle size={12} /> &lt;24h sin confirmar</span>
                )}
              </td>
              <td className="px-4 py-2.5"><Badge texto={ESTADO_LABELS[c.estado] ?? c.estado} valor={c.estado === 'confirmada' ? 'aprobado' : c.estado} /></td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex justify-end gap-2">
                  <Boton className="!px-3 !py-1.5 text-xs" variante="secundario" onClick={() => abrirAgendar(c)}>
                    {c.fecha_hora ? 'Reprogramar' : 'Agendar'}
                  </Boton>
                  {faltaMenosDe24h(c) && (
                    <Boton className="!px-3 !py-1.5 text-xs" variante="peligro" onClick={() => marcarRechazado(c)}>Sin respuesta</Boton>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {!citas.length && <TableEmpty colSpan={5}>No hay citas de medicina laboral pendientes</TableEmpty>}
        </tbody>
      </TableShell>

      <Modal open={!!modalAgendar} onClose={() => setModalAgendar(null)} titulo={`Agendar · ${modalAgendar?.postulaciones.candidatos.nombre}`} ancho="max-w-sm">
        <div className="flex flex-col gap-3">
          <Input label="Fecha y hora" type="datetime-local" value={fechaHora} onChange={(e) => setFechaHora(e.target.value)} required />
          <Input label="Lugar" value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Ej: Consultorio de Medicina Laboral" />
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModalAgendar(null)}>Cancelar</Boton>
            <Boton disabled={guardando || !fechaHora} onClick={guardarAgenda}>{guardando ? 'Enviando…' : 'Agendar y Notificar'}</Boton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
