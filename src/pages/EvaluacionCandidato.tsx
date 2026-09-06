import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Card, Badge, Boton, Modal, Select, Input, Textarea, TableHead, TableEmpty, filaZebra } from '../components/ui'
import { useAlert } from '../lib/alerts'
import { crearNotificacion } from '../lib/notificaciones'
import { ESTADO_POSTULACION_LABELS, formatoFecha, formatoFechaHora, bogotaISOString } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Postulacion = Tables<'postulaciones'> & { candidatos: Tables<'candidatos'>; vacantes: Tables<'vacantes'> }
type Evaluacion = Tables<'evaluacion_competencias'> & { competencias: Tables<'competencias'> }
type Entrevista = Tables<'entrevistas'> & { profiles: { nombre: string } | null }
type DocumentoPostulacion = Tables<'documentos_postulacion'>
type PerfilSociodemografico = Tables<'perfil_sociodemografico'>
type Vinculacion = Tables<'vinculacion_seguridad_social'>

const TIPO_ENTREVISTA_LABELS: Record<string, string> = {
  inicial: 'Entrevista Inicial', tecnica: 'Prueba Técnica',
  area_solicitante: 'Entrevista con Área', final_gerencia: 'Entrevista Final Gerencia',
}
const ESTADO_CITA_LABELS: Record<string, string> = {
  propuesta: 'Propuesta', confirmada: 'Confirmada', rechazada_candidato: 'Rechazada por el candidato',
  aplazada: 'Aplazada', completada: 'Completada',
}
const TIPO_DOCUMENTO_LABELS: Record<string, string> = {
  cedula: 'Cédula de Ciudadanía', diploma: 'Diploma o Certificado de Estudios', certificaciones: 'Certificaciones Laborales',
}

export default function EvaluacionCandidato() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const { confirm, notify } = useAlert()
  const [tab, setTab] = useState<'resumen' | 'evaluaciones' | 'entrevistas' | 'documentos' | 'vinculacion'>('resumen')
  const [postulacion, setPostulacion] = useState<Postulacion | null>(null)
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([])
  const [documentos, setDocumentos] = useState<DocumentoPostulacion[]>([])
  const [perfilSocio, setPerfilSocio] = useState<PerfilSociodemografico | null>(null)
  const [vinculacion, setVinculacion] = useState<Vinculacion | null>(null)
  const [formVinculacion, setFormVinculacion] = useState({ arl: '', eps: '', fondo_pension: '', fecha_vinculacion: '' })
  const [guardandoVinculacion, setGuardandoVinculacion] = useState(false)
  const [modalEntrevista, setModalEntrevista] = useState(false)
  const [tipoEnt, setTipoEnt] = useState<Tables<'entrevistas'>['tipo']>('inicial')
  const [fechaEnt, setFechaEnt] = useState('')
  const [resultadoEnt, setResultadoEnt] = useState('')
  const [comentariosEnt, setComentariosEnt] = useState('')
  const [modalAgendar, setModalAgendar] = useState(false)
  const [fechaAgendar, setFechaAgendar] = useState('')
  const [lugarAgendar, setLugarAgendar] = useState('')
  const [enviandoAgenda, setEnviandoAgenda] = useState(false)

  async function cargar() {
    const { data: p } = await supabase.from('postulaciones').select('*, candidatos(*), vacantes(*)').eq('id', Number(id)).single()
    setPostulacion(p as any)
    if (p) {
      const { data: vc } = await supabase.from('vacante_competencias').select('*, competencias(*)').eq('vacante_id', p.vacante_id)
      const { data: ev } = await supabase.from('evaluacion_competencias').select('*, competencias(*)').eq('postulacion_id', p.id)
      const existentes = new Set((ev ?? []).map((e) => e.competencia_id))
      const faltantes = (vc ?? []).filter((c) => !existentes.has(c.competencia_id))
      if (faltantes.length) {
        await supabase.from('evaluacion_competencias').upsert(
          faltantes.map((c) => ({ postulacion_id: p.id, competencia_id: c.competencia_id, peso: c.peso })),
          { onConflict: 'postulacion_id,competencia_id', ignoreDuplicates: true }
        )
        const { data: ev2 } = await supabase.from('evaluacion_competencias').select('*, competencias(*)').eq('postulacion_id', p.id)
        setEvaluaciones((ev2 as any) ?? [])
      } else {
        setEvaluaciones((ev as any) ?? [])
      }
      const { data: ents } = await supabase.from('entrevistas').select('*, profiles(nombre)').eq('postulacion_id', p.id).order('fecha')
      setEntrevistas((ents as any) ?? [])
      const { data: docs } = await supabase.from('documentos_postulacion').select('*').eq('postulacion_id', p.id).order('created_at')
      setDocumentos(docs ?? [])
      const { data: ps } = await supabase.from('perfil_sociodemografico').select('*').eq('postulacion_id', p.id).maybeSingle()
      setPerfilSocio(ps ?? null)
      const { data: vs } = await supabase.from('vinculacion_seguridad_social').select('*').eq('postulacion_id', p.id).maybeSingle()
      setVinculacion(vs ?? null)
      if (vs) setFormVinculacion({ arl: vs.arl ?? '', eps: vs.eps ?? '', fondo_pension: vs.fondo_pension ?? '', fecha_vinculacion: vs.fecha_vinculacion ?? '' })
      else if (ps) setFormVinculacion((f) => ({ ...f, arl: ps.arl ?? '', eps: ps.eps ?? '', fondo_pension: ps.fondo_pension ?? '' }))
    }
  }

  useEffect(() => { cargar() }, [id])

  async function actualizarCampo(evId: number, campo: 'autoevaluacion' | 'evaluador1' | 'evaluador2', valor: string) {
    const num = valor === '' ? null : Number(valor)
    setEvaluaciones((prev) => prev.map((e) => e.id === evId ? { ...e, [campo]: num } : e))
    if (campo === 'autoevaluacion') await supabase.from('evaluacion_competencias').update({ autoevaluacion: num }).eq('id', evId)
    else if (campo === 'evaluador1') await supabase.from('evaluacion_competencias').update({ evaluador1: num }).eq('id', evId)
    else await supabase.from('evaluacion_competencias').update({ evaluador2: num }).eq('id', evId)
    cargar()
  }

  const puntajeFinal = useMemo(() => {
    const pesoTotal = evaluaciones.reduce((a, e) => a + Number(e.peso), 0)
    if (!pesoTotal) return null
    const suma = evaluaciones.reduce((a, e) => a + (Number(e.promedio ?? 0) * Number(e.peso)), 0)
    return Math.round((suma / pesoTotal) * 20) / 20
  }, [evaluaciones])

  async function noSeleccionar() {
    if (!postulacion) return
    const ok = await confirm(`¿Confirmas que descartas a ${postulacion.candidatos.nombre} del proceso?`,
      { titulo: 'Confirmar decisión', variante: 'peligro', textoConfirmar: 'Descartar' })
    if (!ok) return
    await supabase.from('postulaciones').update({
      estado: 'descartado', motivo_descarte: 'no_cumple_entrevista', updated_at: new Date().toISOString(),
    }).eq('id', postulacion.id)
    notify('El candidato fue descartado del proceso.', 'info')
    cargar()
  }

  async function aprobarEntrevista() {
    if (!postulacion) return
    const ok = await confirm(
      `${postulacion.candidatos.nombre} pasará a la etapa de medicina laboral. ¿Confirmas?`,
      { titulo: 'Aprobar entrevista', textoConfirmar: 'Aprobar' },
    )
    if (!ok) return
    await supabase.from('postulaciones').update({ estado: 'finalista', updated_at: new Date().toISOString() }).eq('id', postulacion.id)
    const { data: citaExistente } = await supabase.from('citas_medicina_laboral').select('id').eq('postulacion_id', postulacion.id).maybeSingle()
    if (!citaExistente) await supabase.from('citas_medicina_laboral').insert({ postulacion_id: postulacion.id, estado: 'programada' })
    notify('El candidato pasó a la bandeja de agenda de medicina laboral.', 'success')
    cargar()
  }

  async function agregarEntrevista() {
    if (!postulacion || !perfil) return
    await supabase.from('entrevistas').insert({
      postulacion_id: postulacion.id, tipo: tipoEnt, fecha: fechaEnt ? bogotaISOString(fechaEnt) : null,
      entrevistador_id: perfil.id, resultado: resultadoEnt, comentarios: comentariosEnt, estado_cita: 'completada',
    })
    setModalEntrevista(false); setFechaEnt(''); setResultadoEnt(''); setComentariosEnt('')
    cargar()
  }

  async function agendarEntrevista() {
    if (!postulacion || !perfil || !fechaAgendar) return
    setEnviandoAgenda(true)
    const { data: ent, error } = await supabase.from('entrevistas').insert({
      postulacion_id: postulacion.id, tipo: 'inicial', fecha: bogotaISOString(fechaAgendar), lugar: lugarAgendar || null,
      entrevistador_id: perfil.id, estado_cita: 'propuesta',
    }).select('id').single()
    if (error || !ent) { setEnviandoAgenda(false); notify('No se pudo agendar la entrevista.', 'error'); return }
    if (postulacion.candidatos.email) {
      const { data: tokenRow } = await supabase.from('candidato_tokens')
        .insert({ postulacion_id: postulacion.id, tipo: 'entrevista' }).select('token').single()
      if (tokenRow) {
        const { data: sesion } = await supabase.auth.getSession()
        const { data, error: fnError } = await supabase.functions.invoke('notificar-candidato', {
          body: { postulacion_id: postulacion.id, tipo: 'entrevista', token: tokenRow.token },
          headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
        })
        if (fnError || data?.error) notify(`Se agendó, pero no se pudo enviar el correo: ${data?.error ?? fnError?.message}`, 'warning')
        else notify('Se envió al candidato la invitación a la entrevista.', 'success')
      }
    } else {
      notify('Se agendó, pero el candidato no tiene correo registrado.', 'warning')
    }
    setEnviandoAgenda(false); setModalAgendar(false); setFechaAgendar(''); setLugarAgendar('')
    cargar()
  }

  async function marcarDocumento(doc: DocumentoPostulacion, estado: 'validado' | 'rechazado') {
    await supabase.from('documentos_postulacion').update({ estado }).eq('id', doc.id)
    if (estado === 'rechazado' && postulacion) {
      await crearNotificacion(postulacion.vacantes.solicitante_id, `Documento rechazado · ${postulacion.candidatos.nombre}`,
        `El documento "${TIPO_DOCUMENTO_LABELS[doc.tipo] ?? doc.tipo}" no fue validado.`, { tipo: 'warning' })
    }
    cargar()
  }

  async function finalizarVinculacion() {
    if (!postulacion || !perfil) return
    const ok = await confirm(
      `Esto marcará a ${postulacion.candidatos.nombre} como listo para presentarse a laborar y notificará al coordinador. ¿Confirmas?`,
      { titulo: 'Finalizar vinculación', textoConfirmar: 'Finalizar' },
    )
    if (!ok) return
    setGuardandoVinculacion(true)
    const payload = { ...formVinculacion, fecha_vinculacion: formVinculacion.fecha_vinculacion || null, gestionado_por: perfil.id }
    if (vinculacion) await supabase.from('vinculacion_seguridad_social').update(payload).eq('id', vinculacion.id)
    else await supabase.from('vinculacion_seguridad_social').insert({ postulacion_id: postulacion.id, ...payload })
    await supabase.from('postulaciones').update({ estado: 'seleccionado', updated_at: new Date().toISOString() }).eq('id', postulacion.id)
    const fechaTexto = formVinculacion.fecha_vinculacion ? formatoFecha(formVinculacion.fecha_vinculacion) : 'la fecha acordada'
    await crearNotificacion(postulacion.vacantes.solicitante_id, `Candidato listo para iniciar · ${postulacion.candidatos.nombre}`,
      `${postulacion.candidatos.nombre} completó su vinculación y puede presentarse a laborar desde ${fechaTexto}.`, { tipo: 'success' })
    setGuardandoVinculacion(false)
    notify('Proceso finalizado. Se notificó al coordinador.', 'success')
    cargar()
  }

  async function verDocumento(doc: DocumentoPostulacion) {
    const { data: sesion } = await supabase.auth.getSession()
    const { data, error } = await supabase.functions.invoke('portal-candidato', {
      body: { accion: 'firmar_documento', path: doc.url },
      headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
    })
    if (error || data?.error) { notify('No se pudo generar el enlace del documento.', 'error'); return }
    window.open(data.url, '_blank')
  }

  if (!postulacion) return <div className="text-slate-500">Cargando…</div>
  const c = postulacion.candidatos
  const entrevistaVigente = entrevistas.find((e) => e.estado_cita === 'propuesta' || e.estado_cita === 'confirmada')

  return (
    <div>
      <PageHeader titulo={c.nombre} subtitulo={`${postulacion.vacantes.cargo} · ${postulacion.vacantes.codigo}`}
        acciones={<Badge texto={ESTADO_POSTULACION_LABELS[postulacion.estado]} valor={postulacion.estado} />} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-lg font-semibold text-white">
              {c.nombre.slice(0, 2).toUpperCase()}
            </div>
            <p className="mt-2 font-semibold text-slate-700">{c.nombre}</p>
            <p className="text-xs text-slate-400">{c.email}</p>
          </div>
          <dl className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-400">Teléfono</dt><dd>{c.telefono ?? '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Experiencia</dt><dd>{c.experiencia_anios ?? '-'} años</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Formación</dt><dd>{c.formacion ?? '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Fuente</dt><dd className="capitalize">{c.fuente?.replace('_', ' ')}</dd></div>
          </dl>
          {puntajeFinal != null && (
            <div className="mt-4 rounded-xl bg-gradient-to-br from-brand to-brand-light p-4 text-center text-white">
              <p className="text-xs opacity-80">Puntaje Final</p>
              <p className="text-2xl font-bold">{puntajeFinal.toFixed(1)} / 5.0</p>
            </div>
          )}
          {postulacion.estado !== 'descartado' && postulacion.estado !== 'finalista' && postulacion.estado !== 'seleccionado' && (
            <div className="mt-4 flex flex-col gap-2">
              <Boton variante="exito" onClick={aprobarEntrevista}>Aprobar Entrevista</Boton>
              <Boton variante="peligro" onClick={noSeleccionar}>No Seleccionar</Boton>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-4 flex gap-2 border-b border-slate-200 text-sm">
            {(['resumen', 'evaluaciones', 'entrevistas', 'documentos', 'vinculacion'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-2 font-medium capitalize ${tab === t ? 'border-b-2 border-brand text-brand' : 'text-slate-500'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'resumen' && (
            <div className="text-sm text-slate-600">
              <p>Postulado el {formatoFecha(postulacion.fecha_postulacion)}.</p>
              {postulacion.notas && <p className="mt-2 rounded bg-slate-50 p-3">{postulacion.notas}</p>}
              {c.hoja_vida_url && <a href={c.hoja_vida_url} target="_blank" className="mt-2 inline-block text-brand-light hover:underline">Ver hoja de vida</a>}
            </div>
          )}

          {tab === 'evaluaciones' && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <TableHead>
                  <th>Competencia</th><th>Peso</th>
                  <th>Autoevaluación</th><th>Evaluador 1</th>
                  <th>Evaluador 2</th><th>Promedio</th>
                </TableHead>
                <tbody>
                  {evaluaciones.map((e, i) => (
                    <tr key={e.id} className={filaZebra(i)}>
                      <td className="px-4 py-2">{e.competencias.nombre}</td>
                      <td className="px-4 py-2 text-slate-500">{e.peso}%</td>
                      {(['autoevaluacion', 'evaluador1', 'evaluador2'] as const).map((campo) => (
                        <td key={campo} className="px-4 py-2">
                          <input type="number" min={0} max={5} step={0.1} defaultValue={e[campo] ?? ''}
                            onBlur={(ev) => actualizarCampo(e.id, campo, ev.target.value)}
                            className="w-16 rounded border border-slate-300 px-1.5 py-1 text-xs" />
                        </td>
                      ))}
                      <td className="px-4 py-2 font-semibold text-brand">{e.promedio ?? '-'}</td>
                    </tr>
                  ))}
                  {!evaluaciones.length && <TableEmpty colSpan={6}>Esta vacante no tiene competencias configuradas</TableEmpty>}
                </tbody>
                {puntajeFinal != null && (
                  <tfoot>
                    <tr><td colSpan={5} className="px-4 pt-3 text-right font-medium text-slate-600">Puntaje Final</td>
                      <td className="px-4 pt-3 text-lg font-bold text-brand">{puntajeFinal.toFixed(1)} / 5.0</td></tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {tab === 'entrevistas' && (
            <div>
              <div className="mb-3 flex justify-end gap-2">
                {!entrevistaVigente && (
                  <Boton className="!px-3 !py-1.5 text-xs" onClick={() => setModalAgendar(true)}>Agendar Entrevista</Boton>
                )}
                <Boton variante="secundario" className="!px-3 !py-1.5 text-xs" onClick={() => setModalEntrevista(true)}>+ Registrar Resultado</Boton>
              </div>
              <div className="flex flex-col gap-2">
                {entrevistas.map((e) => (
                  <div key={e.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-700">{TIPO_ENTREVISTA_LABELS[e.tipo]}</span>
                      <div className="flex items-center gap-2">
                        <Badge texto={ESTADO_CITA_LABELS[e.estado_cita] ?? e.estado_cita} valor={e.estado_cita} />
                        <span className="text-xs text-slate-400">{formatoFechaHora(e.fecha)}</span>
                      </div>
                    </div>
                    {e.lugar && <p className="text-xs text-slate-400">Lugar: {e.lugar}</p>}
                    <p className="text-xs text-slate-500">Entrevistador: {e.profiles?.nombre ?? '-'} · Resultado: {e.resultado ?? '-'}</p>
                    {e.comentarios && <p className="mt-1 text-xs text-slate-600">{e.comentarios}</p>}
                  </div>
                ))}
                {!entrevistas.length && <p className="py-6 text-center text-sm text-slate-400">Sin entrevistas registradas</p>}
              </div>
            </div>
          )}

          {tab === 'documentos' && (
            <div className="flex flex-col gap-2">
              {documentos.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-700">{TIPO_DOCUMENTO_LABELS[doc.tipo] ?? doc.tipo}</p>
                    <button onClick={() => verDocumento(doc)} className="flex items-center gap-1 text-xs text-brand-light hover:underline">
                      Ver documento <ExternalLink size={11} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge texto={doc.estado} valor={doc.estado === 'validado' ? 'aprobado' : doc.estado === 'rechazado' ? 'rechazado' : 'pendiente'} />
                    {doc.estado === 'recibido' && (
                      <div className="flex gap-1">
                        <Boton className="!px-2 !py-1 text-xs" variante="exito" onClick={() => marcarDocumento(doc, 'validado')}>Validar</Boton>
                        <Boton className="!px-2 !py-1 text-xs" variante="peligro" onClick={() => marcarDocumento(doc, 'rechazado')}>Rechazar</Boton>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!documentos.length && (
                <p className="py-6 text-center text-sm text-slate-400">
                  {postulacion.documentos_recibidos_at ? 'Cargando documentos…' : 'El candidato aún no ha enviado su documentación.'}
                </p>
              )}
            </div>
          )}

          {tab === 'vinculacion' && (
            <div className="flex flex-col gap-4">
              {postulacion.estado === 'seleccionado' && (
                <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Proceso finalizado: el candidato quedó marcado como listo para iniciar.</p>
              )}
              {!perfilSocio ? (
                <p className="py-6 text-center text-sm text-slate-400">El candidato aún no ha diligenciado su perfil sociodemográfico.</p>
              ) : (
                <>
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    <p className="mb-1 font-medium text-slate-700">Perfil sociodemográfico recibido</p>
                    <p>Estado civil: {perfilSocio.estado_civil ?? '-'} · Nivel educativo: {perfilSocio.nivel_educativo ?? '-'}</p>
                    <p>EPS: {perfilSocio.eps ?? '-'} · ARL: {perfilSocio.arl ?? '-'} · Fondo Pensión: {perfilSocio.fondo_pension ?? '-'}</p>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-600">Vinculación (ARL / EPS / Pensión)</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input label="ARL" value={formVinculacion.arl} onChange={(e) => setFormVinculacion({ ...formVinculacion, arl: e.target.value })} />
                    <Input label="EPS" value={formVinculacion.eps} onChange={(e) => setFormVinculacion({ ...formVinculacion, eps: e.target.value })} />
                    <Input label="Fondo de Pensión" value={formVinculacion.fondo_pension} onChange={(e) => setFormVinculacion({ ...formVinculacion, fondo_pension: e.target.value })} />
                    <Input label="Fecha de inicio a laborar" type="date" value={formVinculacion.fecha_vinculacion} onChange={(e) => setFormVinculacion({ ...formVinculacion, fecha_vinculacion: e.target.value })} />
                  </div>
                  {postulacion.estado !== 'seleccionado' && (
                    <Boton disabled={guardandoVinculacion} onClick={finalizarVinculacion}>
                      {guardandoVinculacion ? 'Guardando…' : 'Finalizar Vinculación y Notificar al Coordinador'}
                    </Boton>
                  )}
                </>
              )}
            </div>
          )}
        </Card>
      </div>

      <Modal open={modalEntrevista} onClose={() => setModalEntrevista(false)} titulo="Registrar Resultado de Entrevista">
        <div className="flex flex-col gap-3">
          <Select label="Tipo" value={tipoEnt} onChange={(e) => setTipoEnt(e.target.value as any)}>
            {Object.entries(TIPO_ENTREVISTA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <Input label="Fecha" type="datetime-local" value={fechaEnt} onChange={(e) => setFechaEnt(e.target.value)} />
          <Input label="Resultado" value={resultadoEnt} onChange={(e) => setResultadoEnt(e.target.value)} placeholder="Continuar / Descartar / Recomendar…" />
          <Textarea label="Comentarios" rows={3} value={comentariosEnt} onChange={(e) => setComentariosEnt(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModalEntrevista(false)}>Cancelar</Boton>
            <Boton onClick={agregarEntrevista}>Guardar</Boton>
          </div>
        </div>
      </Modal>

      <Modal open={modalAgendar} onClose={() => setModalAgendar(false)} titulo="Agendar Entrevista">
        <div className="flex flex-col gap-3">
          <Input label="Fecha y hora" type="datetime-local" value={fechaAgendar} onChange={(e) => setFechaAgendar(e.target.value)} required />
          <Input label="Lugar" value={lugarAgendar} onChange={(e) => setLugarAgendar(e.target.value)} placeholder="Ej: Oficina de Talento Humano, Piso 2" />
          <p className="rounded-lg bg-sky-50 p-2 text-xs text-sky-700">Se enviará un correo al candidato para que confirme, rechace o solicite aplazar la cita.</p>
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModalAgendar(false)}>Cancelar</Boton>
            <Boton disabled={enviandoAgenda || !fechaAgendar} onClick={agendarEntrevista}>{enviandoAgenda ? 'Enviando…' : 'Agendar y Notificar'}</Boton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
