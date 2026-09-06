import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...corsHeaders } })

const SITE_URL = 'https://juanetayo-projects.github.io/vacantes'

type Vars = { candidato: string; cargo: string }
const PLANTILLAS: Record<string, { asunto: (v: Vars) => string; titulo: string; cuerpo: (v: Vars) => string; boton: string; ruta: string }> = {
  documentos: {
    asunto: (v) => `Documentación requerida · ${v.cargo}`,
    titulo: 'Continuemos con tu proceso de selección',
    cuerpo: (v) => `Hola ${v.candidato}, nos alegra que quieras continuar en el proceso de selección para el cargo de <strong>${v.cargo}</strong> en la Clínica de Alta Complejidad Santa Bárbara. Para seguir, por favor ingresa al siguiente enlace y adjunta la documentación solicitada.`,
    boton: 'Cargar mis documentos',
    ruta: 'documentos',
  },
  entrevista: {
    asunto: (v) => `Invitación a entrevista · ${v.cargo}`,
    titulo: 'Te invitamos a una entrevista',
    cuerpo: (v) => `Hola ${v.candidato}, queremos invitarte a una entrevista para el cargo de <strong>${v.cargo}</strong>. Ingresa al siguiente enlace para ver la fecha y lugar propuestos, y confirmar tu asistencia.`,
    boton: 'Ver y confirmar cita',
    ruta: 'cita',
  },
  medicina_laboral: {
    asunto: (v) => `Cita de medicina laboral · ${v.cargo}`,
    titulo: 'Cita de medicina laboral',
    cuerpo: (v) => `Hola ${v.candidato}, como parte del proceso de selección para el cargo de <strong>${v.cargo}</strong>, te hemos agendado una cita con el médico laboral. Ingresa al siguiente enlace para ver los detalles y confirmar tu asistencia.`,
    boton: 'Ver y confirmar cita',
    ruta: 'cita',
  },
  perfil_sociodemografico: {
    asunto: (v) => `Perfil sociodemográfico · ${v.cargo}`,
    titulo: '¡Felicitaciones! Continuemos con tu vinculación',
    cuerpo: (v) => `Hola ${v.candidato}, tu concepto de medicina laboral fue favorable para el cargo de <strong>${v.cargo}</strong>. Para continuar, por favor diligencia tu perfil sociodemográfico en el siguiente enlace.`,
    boton: 'Diligenciar perfil',
    ruta: 'perfil-sociodemografico',
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const authHeader = req.headers.get('Authorization') ?? ''
  const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } })
  const { data: { user } } = await caller.auth.getUser()
  if (!user) return json(401, { error: 'No autenticado' })

  const { postulacion_id, tipo, token } = await req.json()
  const plantilla = PLANTILLAS[tipo]
  if (!plantilla) return json(400, { error: 'Tipo de notificación inválido' })

  const { data: p } = await admin.from('postulaciones')
    .select('*, candidatos(nombre, email), vacantes(cargo)').eq('id', postulacion_id).single()
  if (!p?.candidatos?.email) return json(400, { error: 'El candidato no tiene correo registrado' })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return json(500, { error: 'RESEND_API_KEY no está configurada en este proyecto de Supabase.' })

  const link = `${SITE_URL}/#/postulacion/${plantilla.ruta}/${token}`
  const html = `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#E4E9F3;padding:40px 0;font-family:Arial,Helvetica,sans-serif;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(6,21,54,0.25);">
        <tr><td style="background:linear-gradient(135deg,#0D2D6B,#16468E);padding:28px 32px;text-align:center;">
          <img src="${SITE_URL}/images/logo_cacsb_blanc.png" width="120" style="display:block;margin:0 auto 12px;" />
          <div style="color:#fff;font-weight:bold;font-size:18px;">Gestión de Vacantes</div>
          <div style="color:#cdd9f2;font-size:12px;">Procesos de Selección · Talento Humano</div>
        </td></tr>
        <tr><td style="padding:36px 32px 28px;">
          <h1 style="color:#0D2D6B;font-size:20px;margin:0 0 16px;">${plantilla.titulo}</h1>
          <p style="color:#475569;font-size:14px;line-height:22px;margin:0 0 24px;">${plantilla.cuerpo({ candidato: p.candidatos.nombre, cargo: p.vacantes?.cargo ?? '' })}</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
            <tr><td style="background:linear-gradient(135deg,#0D2D6B,#16468E);border-radius:10px;">
              <a href="${link}" style="display:block;padding:14px 32px;color:#fff;font-weight:bold;font-size:14px;text-decoration:none;">${plantilla.boton}</a>
            </td></tr>
          </table>
          <p style="color:#94a3b8;font-size:11px;text-align:center;">Si el botón no funciona, copia y pega este enlace:<br/>${link}</p>
        </td></tr>
        <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:16px 32px;text-align:center;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">Clínica de Alta Complejidad Santa Bárbara · Sistema Interno</p>
        </td></tr>
      </table>
    </td></tr>
  </table>`

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Talento Humano CAC Santa Bárbara <notificaciones@cacsantabarbara.co>',
      to: [p.candidatos.email],
      subject: plantilla.asunto({ cargo: p.vacantes?.cargo ?? '' }),
      html,
    }),
  })
  if (!resp.ok) return json(400, { error: `Resend: ${await resp.text()}` })
  return json(200, { ok: true })
})
