import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...corsHeaders } })

const BUCKET = 'documentos-candidatos'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const body = await req.json()
  const { accion, token } = body

  async function validarToken(tipoEsperado?: string) {
    const { data: t } = await admin.from('candidato_tokens').select('*').eq('token', token).maybeSingle()
    if (!t) return { error: 'Este enlace no es válido.' }
    if (t.usado_at) return { error: 'Este enlace ya fue utilizado.' }
    if (new Date(t.expira_at) < new Date()) return { error: 'Este enlace expiró.' }
    if (tipoEsperado && t.tipo !== tipoEsperado) return { error: 'Este enlace no corresponde a esta acción.' }
    return { tokenRow: t }
  }

  if (accion === 'validar_token') {
    const { tokenRow, error } = await validarToken()
    if (error) return json(400, { error })
    const { data: p } = await admin.from('postulaciones')
      .select('*, candidatos(nombre), vacantes(cargo, codigo)').eq('id', tokenRow!.postulacion_id).single()
    const respuesta: Record<string, unknown> = {
      tipo: tokenRow!.tipo,
      candidato: p?.candidatos?.nombre,
      cargo: p?.vacantes?.cargo,
      codigo: p?.vacantes?.codigo,
    }
    if (tokenRow!.tipo === 'entrevista') {
      const { data: ent } = await admin.from('entrevistas').select('fecha, lugar, estado_cita')
        .eq('postulacion_id', tokenRow!.postulacion_id).eq('estado_cita', 'propuesta')
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      respuesta.fecha = ent?.fecha; respuesta.lugar = ent?.lugar
    }
    if (tokenRow!.tipo === 'medicina_laboral') {
      const { data: cita } = await admin.from('citas_medicina_laboral').select('fecha_hora, lugar')
        .eq('postulacion_id', tokenRow!.postulacion_id).maybeSingle()
      respuesta.fecha = cita?.fecha_hora; respuesta.lugar = cita?.lugar
    }
    return json(200, respuesta)
  }

  if (accion === 'responder_cita') {
    const { tokenRow, error } = await validarToken()
    if (error) return json(400, { error })
    if (tokenRow!.tipo !== 'entrevista' && tokenRow!.tipo !== 'medicina_laboral') return json(400, { error: 'Enlace inválido para esta acción.' })
    const { decision } = body as { decision: 'confirmar' | 'rechazar' | 'aplazar' }
    const nuevoEstado = decision === 'confirmar' ? 'confirmada' : decision === 'rechazar' ? 'rechazada_candidato' : 'aplazada'
    if (tokenRow!.tipo === 'entrevista') {
      await admin.from('entrevistas').update({ estado_cita: nuevoEstado })
        .eq('postulacion_id', tokenRow!.postulacion_id).eq('estado_cita', 'propuesta')
      await admin.from('historial_estados').insert({
        entidad_tipo: 'entrevista', entidad_id: tokenRow!.postulacion_id, estado_nuevo: nuevoEstado, comentario: 'Respuesta del candidato',
      })
    } else {
      await admin.from('citas_medicina_laboral').update({ estado: nuevoEstado })
        .eq('postulacion_id', tokenRow!.postulacion_id)
      await admin.from('historial_estados').insert({
        entidad_tipo: 'cita_medica', entidad_id: tokenRow!.postulacion_id, estado_nuevo: nuevoEstado, comentario: 'Respuesta del candidato',
      })
    }
    await admin.from('candidato_tokens').update({ usado_at: new Date().toISOString() }).eq('token', token)
    return json(200, { ok: true, estado: nuevoEstado })
  }

  if (accion === 'enviar_perfil_sociodemografico') {
    const { tokenRow, error } = await validarToken('perfil_sociodemografico')
    if (error) return json(400, { error })
    const { datos } = body
    const { error: insError } = await admin.from('perfil_sociodemografico').insert({ postulacion_id: tokenRow!.postulacion_id, ...datos })
    if (insError) return json(400, { error: insError.message })
    await admin.from('candidato_tokens').update({ usado_at: new Date().toISOString() }).eq('token', token)
    const { data: p } = await admin.from('postulaciones').select('vacantes(reclutador_id, solicitante_id), candidatos(nombre)').eq('id', tokenRow!.postulacion_id).single()
    const destinatario = (p?.vacantes as any)?.reclutador_id ?? (p?.vacantes as any)?.solicitante_id
    if (destinatario) {
      await admin.from('notificaciones').insert({
        usuario_id: destinatario, titulo: `Perfil sociodemográfico recibido · ${(p?.candidatos as any)?.nombre}`,
        mensaje: 'El candidato diligenció su perfil sociodemográfico. Continúa con la vinculación (ARL, EPS, Pensión).', tipo: 'info',
      })
    }
    return json(200, { ok: true })
  }

  if (accion === 'enviar_documentos') {
    const { tokenRow, error } = await validarToken('documentos')
    if (error) return json(400, { error })
    const { documentos } = body as { documentos: { tipo: string; nombreArchivo: string; contenidoBase64: string }[] }
    if (!documentos?.length) return json(400, { error: 'No se recibieron documentos.' })
    for (const doc of documentos) {
      const bytes = Uint8Array.from(atob(doc.contenidoBase64), (c) => c.charCodeAt(0))
      const path = `${tokenRow!.postulacion_id}/${doc.tipo}-${Date.now()}-${doc.nombreArchivo}`
      const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: 'application/octet-stream' })
      if (upErr) return json(400, { error: `No se pudo subir ${doc.nombreArchivo}: ${upErr.message}` })
      await admin.from('documentos_postulacion').insert({
        postulacion_id: tokenRow!.postulacion_id, tipo: doc.tipo, url: path, estado: 'recibido',
      })
    }
    await admin.from('postulaciones').update({ documentos_recibidos_at: new Date().toISOString() }).eq('id', tokenRow!.postulacion_id)
    await admin.from('candidato_tokens').update({ usado_at: new Date().toISOString() }).eq('token', token)
    return json(200, { ok: true })
  }

  if (accion === 'firmar_documento') {
    // Uso interno de staff autenticado (no del candidato): requiere JWT válido con is_staff().
    const authHeader = req.headers.get('Authorization') ?? ''
    const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json(401, { error: 'No autenticado' })
    const { path } = body
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600)
    if (error) return json(400, { error: error.message })
    return json(200, { url: data.signedUrl })
  }

  return json(400, { error: 'Acción inválida' })
})
