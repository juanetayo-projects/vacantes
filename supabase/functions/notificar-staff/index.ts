import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...corsHeaders } })

const SITE_URL = 'https://juanetayo-projects.github.io/vacantes'

type Vars = { destinatario: string; cargo: string; codigo: string; comentario?: string }
const PLANTILLAS: Record<string, { asunto: (v: Vars) => string; titulo: (v: Vars) => string; cuerpo: (v: Vars) => string; color: string }> = {
  aprobada: {
    asunto: (v) => `Solicitud ${v.codigo} aprobada`,
    titulo: () => 'Tu solicitud fue aprobada',
    cuerpo: (v) => `Hola ${v.destinatario}, la solicitud de vacante para <strong>${v.cargo}</strong> (${v.codigo}) completó el flujo de aprobación y ya puede continuar con el proceso de reclutamiento.`,
    color: '#027A48',
  },
  rechazada: {
    asunto: (v) => `Solicitud ${v.codigo} rechazada`,
    titulo: () => 'Tu solicitud fue rechazada',
    cuerpo: (v) => `Hola ${v.destinatario}, la solicitud de vacante para <strong>${v.cargo}</strong> (${v.codigo}) fue rechazada.${v.comentario ? ` Motivo: ${v.comentario}` : ''}`,
    color: '#B42318',
  },
  modificacion_solicitada: {
    asunto: (v) => `Solicitud ${v.codigo}: se pidió modificación`,
    titulo: () => 'Tu solicitud necesita ajustes',
    cuerpo: (v) => `Hola ${v.destinatario}, la solicitud de vacante para <strong>${v.cargo}</strong> (${v.codigo}) requiere ajustes antes de continuar.${v.comentario ? ` Detalle: ${v.comentario}` : ''} Ingresa a la aplicación para corregirla y reenviarla.`,
    color: '#B54708',
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

  const { vacante_id, tipo, comentario } = await req.json()
  const plantilla = PLANTILLAS[tipo]
  if (!plantilla) return json(400, { error: 'Tipo de notificación inválido' })

  const { data: v } = await admin.from('vacantes')
    .select('cargo, codigo, profiles!vacantes_solicitante_id_fkey(nombre, email)')
    .eq('id', vacante_id).single()
  const destinatario = (v as any)?.profiles
  if (!destinatario?.email) return json(400, { error: 'El solicitante no tiene correo registrado' })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return json(500, { error: 'RESEND_API_KEY no está configurada en este proyecto de Supabase.' })

  const vars: Vars = { destinatario: destinatario.nombre, cargo: v!.cargo, codigo: v!.codigo, comentario }
  const link = `${SITE_URL}/#/vacantes/${vacante_id}/aprobacion`
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
          <h1 style="color:${plantilla.color};font-size:20px;margin:0 0 16px;">${plantilla.titulo(vars)}</h1>
          <p style="color:#475569;font-size:14px;line-height:22px;margin:0 0 24px;">${plantilla.cuerpo(vars)}</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
            <tr><td style="background:linear-gradient(135deg,#0D2D6B,#16468E);border-radius:10px;">
              <a href="${link}" style="display:block;padding:14px 32px;color:#fff;font-weight:bold;font-size:14px;text-decoration:none;">Ver solicitud</a>
            </td></tr>
          </table>
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
      to: [destinatario.email],
      subject: plantilla.asunto(vars),
      html,
    }),
  })
  if (!resp.ok) return json(400, { error: `Resend: ${await resp.text()}` })
  return json(200, { ok: true })
})
