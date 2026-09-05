import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...corsHeaders } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const body = await req.json()
  const { accion } = body

  const { count: adminCount } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin')
  const bootstrap = accion === 'crear' && (adminCount ?? 0) === 0

  if (!bootstrap) {
    const authHeader = req.headers.get('Authorization') ?? ''
    const caller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json(401, { error: 'No autenticado' })
    const { data: perfil } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (perfil?.role !== 'admin') return json(403, { error: 'Solo un administrador puede gestionar usuarios' })
  }

  if (accion === 'crear') {
    const { email, password, nombre, role, area_id } = body
    const codigoPerfil = role ?? 'coordinador'
    const { data: plantilla } = await admin.from('perfiles').select('*').eq('codigo', codigoPerfil).single()

    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) return json(400, { error: error.message })
    const { error: perfilError } = await admin.from('profiles').insert({
      id: data.user.id, email, nombre, role: codigoPerfil, area_id: area_id ?? null,
      perfil_id: plantilla?.id ?? null,
      ve_todas_areas: plantilla?.ve_todas_areas ?? false,
      perm_gestion_vacantes: plantilla?.perm_gestion_vacantes ?? false,
      perm_aprobaciones: plantilla?.perm_aprobaciones ?? false,
      perm_reportes: plantilla?.perm_reportes ?? false,
      perm_administracion: plantilla?.perm_administracion ?? false,
      perm_configuracion: plantilla?.perm_configuracion ?? false,
    })
    if (perfilError) {
      await admin.auth.admin.deleteUser(data.user.id)
      return json(400, { error: perfilError.message })
    }
    return json(200, { ok: true, id: data.user.id })
  }

  if (accion === 'eliminar') {
    const { id } = body
    await admin.auth.admin.deleteUser(id)
    return json(200, { ok: true })
  }

  if (accion === 'reset') {
    const { id, password } = body
    const { error } = await admin.auth.admin.updateUserById(id, { password })
    if (error) return json(400, { error: error.message })
    return json(200, { ok: true })
  }

  return json(400, { error: 'Acción inválida' })
})
