import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth, ROLE_LABELS } from '../lib/auth'
import { PageHeader, Card, Boton, Input } from '../components/ui'

const PERMISOS = [
  { key: 'perm_gestion_vacantes', label: 'Gestión de Vacantes' },
  { key: 'perm_aprobaciones', label: 'Aprobaciones' },
  { key: 'perm_reportes', label: 'Reportes' },
  { key: 'perm_administracion', label: 'Administración' },
  { key: 'perm_configuracion', label: 'Configuración' },
] as const

export default function PerfilUsuario() {
  const { perfil, refrescarPerfil } = useAuth()
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    tipo_documento: perfil?.tipo_documento ?? '', numero_documento: perfil?.numero_documento ?? '',
    telefono: perfil?.telefono ?? '', fecha_nacimiento: perfil?.fecha_nacimiento ?? '',
    direccion: perfil?.direccion ?? '', ciudad: perfil?.ciudad ?? '',
  })

  async function guardar() {
    if (!perfil) return
    setGuardando(true)
    await supabase.from('profiles').update(form).eq('id', perfil.id)
    await refrescarPerfil()
    setGuardando(false)
    setEditando(false)
  }

  async function cambiarContrasena() {
    if (!perfil) return
    await supabase.auth.resetPasswordForEmail(perfil.email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}#/reset`,
    })
    setMsg('Te enviamos un enlace a tu correo para cambiar la contraseña.')
  }

  if (!perfil) return null

  return (
    <div>
      <PageHeader titulo="Mi Perfil" acciones={
        <>
          <Boton variante="secundario" onClick={() => setEditando((e) => !e)}>{editando ? 'Cancelar' : 'Editar Perfil'}</Boton>
          <Boton variante="secundario" onClick={cambiarContrasena}>Cambiar Contraseña</Boton>
        </>
      } />
      {msg && <p className="mb-3 text-sm text-emerald-600">{msg}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center text-center lg:col-span-1">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0D2D6B] text-2xl font-semibold text-white">
            {perfil.nombre.slice(0, 2).toUpperCase()}
          </div>
          <p className="mt-3 font-semibold text-slate-700">{perfil.nombre}</p>
          <p className="text-sm text-slate-500">{ROLE_LABELS[perfil.role]}</p>
          <p className="text-xs text-slate-400">{perfil.email}</p>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-600">Información Personal</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Tipo de Documento" disabled={!editando} value={form.tipo_documento}
              onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })} />
            <Input label="Número" disabled={!editando} value={form.numero_documento}
              onChange={(e) => setForm({ ...form, numero_documento: e.target.value })} />
            <Input label="Teléfono" disabled={!editando} value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            <Input label="Fecha de Nacimiento" type="date" disabled={!editando} value={form.fecha_nacimiento ?? ''}
              onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })} />
            <Input label="Dirección" disabled={!editando} value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            <Input label="Ciudad" disabled={!editando} value={form.ciudad}
              onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
          </div>
          {editando && <Boton className="mt-4" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar Cambios'}</Boton>}

          <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-600">Permisos y Roles</h3>
          <p className="mb-2 text-xs text-slate-400">Rol Actual: <b className="text-slate-600">{ROLE_LABELS[perfil.role]}</b></p>
          <div className="grid grid-cols-2 gap-2">
            {PERMISOS.map((p) => (
              <label key={p.key} className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={!!perfil[p.key]} disabled />
                {p.label}
              </label>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
