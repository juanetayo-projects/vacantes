import { useEffect, useState } from 'react'
import { Plus, KeyRound, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth, ROLE_LABELS } from '../../lib/auth'
import { PageHeader, Card, Boton, Modal, Input, Select, Badge } from '../../components/ui'
import type { Tables } from '../../lib/database.types'

type Usuario = Tables<'profiles'> & { areas: { nombre: string } | null }

export default function AdminUsuarios() {
  const { perfil } = useAuth()
  const [tab, setTab] = useState<'usuarios' | 'areas' | 'competencias'>('usuarios')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [areas, setAreas] = useState<Tables<'areas'>[]>([])
  const [competencias, setCompetencias] = useState<Tables<'competencias'>[]>([])
  const [modalUsuario, setModalUsuario] = useState(false)
  const [modalReset, setModalReset] = useState<Usuario | null>(null)
  const [nuevaPass, setNuevaPass] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ email: '', password: '', nombre: '', role: 'solicitante', area_id: '' })

  async function cargar() {
    const [{ data: u }, { data: a }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('*, areas!profiles_area_id_fkey(nombre)').order('nombre'),
      supabase.from('areas').select('*').order('nombre'),
      supabase.from('competencias').select('*').order('nombre'),
    ])
    setUsuarios((u as any) ?? []); setAreas(a ?? []); setCompetencias(c ?? [])
  }

  useEffect(() => { cargar() }, [])

  async function crearUsuario() {
    setError(''); setGuardando(true)
    const { data: sesion } = await supabase.auth.getSession()
    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: { accion: 'crear', ...form, area_id: form.area_id ? Number(form.area_id) : null },
      headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
    })
    setGuardando(false)
    if (error || data?.error) { setError(data?.error ?? error?.message ?? 'Error al crear usuario'); return }
    setModalUsuario(false)
    setForm({ email: '', password: '', nombre: '', role: 'solicitante', area_id: '' })
    cargar()
  }

  async function resetPassword() {
    if (!modalReset) return
    setGuardando(true)
    const { data: sesion } = await supabase.auth.getSession()
    await supabase.functions.invoke('admin-usuarios', {
      body: { accion: 'reset', id: modalReset.id, password: nuevaPass },
      headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
    })
    setGuardando(false); setModalReset(null); setNuevaPass('')
  }

  async function eliminarUsuario(u: Usuario) {
    if (!confirm(`¿Eliminar a ${u.nombre}?`)) return
    const { data: sesion } = await supabase.auth.getSession()
    await supabase.functions.invoke('admin-usuarios', {
      body: { accion: 'eliminar', id: u.id },
      headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
    })
    cargar()
  }

  async function toggleActivo(u: Usuario) {
    await supabase.from('profiles').update({ activo: !u.activo }).eq('id', u.id)
    cargar()
  }

  if (perfil?.role !== 'admin' && !perfil?.perm_administracion) {
    return <p className="text-slate-500">No tienes permisos de administración.</p>
  }

  return (
    <div>
      <PageHeader titulo="Configuración" subtitulo="Usuarios, áreas y competencias" />

      <div className="mb-4 flex gap-2 border-b border-slate-200 text-sm">
        {(['usuarios', 'areas', 'competencias'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 font-medium capitalize ${tab === t ? 'border-b-2 border-[#0D2D6B] text-[#0D2D6B]' : 'text-slate-500'}`}>{t}</button>
        ))}
      </div>

      {tab === 'usuarios' && (
        <Card>
          <div className="mb-3 flex justify-end">
            <Boton onClick={() => setModalUsuario(true)}><Plus size={15} className="mr-1 inline" />Nuevo Usuario</Boton>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr><th className="pb-2">Nombre</th><th className="pb-2">Correo</th><th className="pb-2">Rol</th><th className="pb-2">Área</th><th className="pb-2">Estado</th><th /></tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="py-2">{u.nombre}</td>
                    <td className="py-2 text-slate-500">{u.email}</td>
                    <td className="py-2">{ROLE_LABELS[u.role]}</td>
                    <td className="py-2 text-slate-500">{u.areas?.nombre ?? '-'}</td>
                    <td className="py-2">
                      <button onClick={() => toggleActivo(u)}>
                        <Badge texto={u.activo ? 'Activo' : 'Inactivo'} valor={u.activo ? 'aprobado' : 'rechazado'} />
                      </button>
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button title="Restablecer contraseña" onClick={() => setModalReset(u)} className="text-slate-400 hover:text-[#16468E]"><KeyRound size={15} /></button>
                        <button title="Eliminar" onClick={() => eliminarUsuario(u)} className="text-slate-400 hover:text-red-500"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'areas' && (
        <Card>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400"><tr><th className="pb-2">Nombre</th><th className="pb-2">Código</th><th className="pb-2">Estado</th></tr></thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="py-2">{a.nombre}</td><td className="py-2 text-slate-500">{a.codigo}</td>
                  <td className="py-2"><Badge texto={a.activo ? 'Activo' : 'Inactivo'} valor={a.activo ? 'aprobado' : 'rechazado'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'competencias' && (
        <Card>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400"><tr><th className="pb-2">Nombre</th><th className="pb-2">Tipo</th><th className="pb-2">Peso Defecto</th></tr></thead>
            <tbody>
              {competencias.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="py-2">{c.nombre}</td><td className="py-2 capitalize text-slate-500">{c.tipo}</td><td className="py-2 text-slate-500">{c.peso_defecto}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalUsuario} onClose={() => setModalUsuario(false)} titulo="Nuevo Usuario">
        <div className="flex flex-col gap-3">
          <Input label="Nombre completo" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Input label="Correo institucional" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Contraseña temporal" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select label="Rol" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <Select label="Área" value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
            <option value="">Sin asignar</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Boton disabled={guardando} onClick={crearUsuario}>{guardando ? 'Creando…' : 'Crear Usuario'}</Boton>
        </div>
      </Modal>

      <Modal open={!!modalReset} onClose={() => setModalReset(null)} titulo={`Restablecer contraseña · ${modalReset?.nombre}`}>
        <div className="flex flex-col gap-3">
          <Input label="Nueva contraseña" value={nuevaPass} onChange={(e) => setNuevaPass(e.target.value)} />
          <Boton disabled={guardando || !nuevaPass} onClick={resetPassword}>{guardando ? 'Guardando…' : 'Restablecer'}</Boton>
        </div>
      </Modal>
    </div>
  )
}
