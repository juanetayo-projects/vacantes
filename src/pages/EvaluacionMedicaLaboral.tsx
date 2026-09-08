import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader, Boton, Modal, Select, Textarea, TableShell, TableHead, TableEmpty, filaZebra } from '../components/ui'
import { useAlert } from '../lib/alerts'
import { crearNotificacion } from '../lib/notificaciones'
import { formatoFechaHora } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Cita = Tables<'citas_medicina_laboral'> & {
  postulaciones: Tables<'postulaciones'> & { candidatos: Tables<'candidatos'>; vacantes: Tables<'vacantes'> }
}

export default function EvaluacionMedicaLaboral() {
  const { confirm, notify } = useAlert()
  const [citas, setCitas] = useState<Cita[]>([])
  const [modal, setModal] = useState<Cita | null>(null)
  const [resultado, setResultado] = useState<'apto' | 'apto_con_restricciones' | 'no_apto'>('apto')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    const { data } = await supabase.from('citas_medicina_laboral')
      .select('*, postulaciones(*, candidatos(*), vacantes(*))')
      .eq('estado', 'confirmada').order('fecha_hora')
    setCitas((data as any) ?? [])
  }

  useEffect(() => { cargar() }, [])

  function abrirEvaluacion(c: Cita) {
    setResultado('apto'); setObservaciones('')
    setModal(c)
  }

  async function guardar() {
    if (!modal) return
    if (resultado === 'apto_con_restricciones' && !observaciones.trim()) {
      notify('Describe la restricción en las observaciones antes de guardar.', 'warning')
      return
    }
    const mensajeConfirmacion = resultado === 'apto'
      ? '¿Confirmas que el candidato es apto?'
      : resultado === 'apto_con_restricciones'
        ? '¿Confirmas que el candidato es apto con restricciones? El proceso continúa con la restricción registrada.'
        : '¿Confirmas que el candidato NO es apto? El proceso se cerrará.'
    const ok = await confirm(mensajeConfirmacion, {
      titulo: 'Registrar concepto médico',
      variante: resultado === 'no_apto' ? 'peligro' : 'primario',
      textoConfirmar: 'Confirmar',
    })
    if (!ok) return
    setGuardando(true)
    await supabase.from('citas_medicina_laboral').update({
      resultado_medico: resultado, observaciones_medico: observaciones || null, estado: 'completada',
    }).eq('id', modal.id)

    const p = modal.postulaciones
    if (resultado === 'no_apto') {
      await supabase.from('postulaciones').update({ estado: 'descartado', motivo_descarte: 'rechazo_medicina_laboral' }).eq('id', p.id)
      await crearNotificacion(p.vacantes.solicitante_id, `Candidato rechazado por Medicina Laboral · ${p.candidatos.nombre}`,
        'El concepto de medicina laboral no fue favorable. El proceso se cerró.', { tipo: 'error' })
      if (p.vacantes.reclutador_id) {
        await crearNotificacion(p.vacantes.reclutador_id, `Candidato rechazado por Medicina Laboral · ${p.candidatos.nombre}`,
          'El concepto de medicina laboral no fue favorable. El proceso se cerró.', { tipo: 'error' })
      }
      notify('Se registró el concepto y se cerró el proceso.', 'info')
    } else if (p.candidatos.email) {
      const { data: tokenRow } = await supabase.from('candidato_tokens')
        .insert({ postulacion_id: p.id, tipo: 'perfil_sociodemografico' }).select('token').single()
      if (tokenRow) {
        const { data: sesion } = await supabase.auth.getSession()
        const { data, error } = await supabase.functions.invoke('notificar-candidato', {
          body: { postulacion_id: p.id, tipo: 'perfil_sociodemografico', token: tokenRow.token },
          headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
        })
        const etiqueta = resultado === 'apto_con_restricciones' ? 'Apto con restricciones registrado' : 'Apto registrado'
        if (error || data?.error) notify(`${etiqueta}, pero no se pudo enviar el correo: ${data?.error ?? error?.message}`, 'warning')
        else notify(`${etiqueta}. Se envió al candidato el formulario de perfil sociodemográfico.`, 'success')
      }
    }
    setGuardando(false); setModal(null)
    cargar()
  }

  return (
    <div>
      <PageHeader titulo="Evaluación Médica Laboral" subtitulo="Candidatos con cita confirmada, pendientes de concepto médico" />
      <TableShell>
        <TableHead><th>Candidato</th><th>Vacante</th><th>Fecha</th><th /></TableHead>
        <tbody>
          {citas.map((c, i) => (
            <tr key={c.id} className={filaZebra(i)}>
              <td className="px-4 py-2.5">{c.postulaciones.candidatos.nombre}</td>
              <td className="px-4 py-2.5 text-slate-500">{c.postulaciones.vacantes.cargo}</td>
              <td className="px-4 py-2.5 text-slate-500">{formatoFechaHora(c.fecha_hora)}</td>
              <td className="px-4 py-2.5 text-right">
                <Boton className="!px-3 !py-1.5 text-xs" onClick={() => abrirEvaluacion(c)}>Registrar Concepto</Boton>
              </td>
            </tr>
          ))}
          {!citas.length && <TableEmpty colSpan={4}>No hay candidatos pendientes de evaluación médica</TableEmpty>}
        </tbody>
      </TableShell>

      <Modal open={!!modal} onClose={() => setModal(null)} titulo={`Concepto médico · ${modal?.postulaciones.candidatos.nombre}`} ancho="max-w-sm">
        <div className="flex flex-col gap-3">
          <Select label="Resultado" value={resultado} onChange={(e) => setResultado(e.target.value as any)}>
            <option value="apto">Apto</option>
            <option value="apto_con_restricciones">Apto con restricciones</option>
            <option value="no_apto">No apto</option>
          </Select>
          <Textarea label={resultado === 'apto_con_restricciones' ? 'Restricciones (obligatorio)' : 'Observaciones'}
            rows={4} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModal(null)}>Cancelar</Boton>
            <Boton disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
