import { useEffect, useState } from 'react'
import { Plus, KeyRound, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth, ROLE_LABELS } from '../../lib/auth'
import { PageHeader, Card, Boton, Modal, Input, Select, Badge, TableShell, TableHead, TableEmpty, filaZebra } from '../../components/ui'
import { useAlert } from '../../lib/alerts'
import type { Tables, TablesUpdate } from '../../lib/database.types'

type Usuario = Tables<'profiles'> & { areas: { nombre: string } | null }
type Perfil = Tables<'perfiles'>

const PERMISOS_CATALOGO = [
  { key: 've_todas_areas', label: 'Ve todas las áreas' },
  { key: 'perm_gestion_vacantes', label: 'Gestión de Vacantes' },
  { key: 'perm_aprobaciones', label: 'Aprobaciones' },
  { key: 'perm_reportes', label: 'Reportes' },
  { key: 'perm_administracion', label: 'Administración' },
  { key: 'perm_configuracion', label: 'Configuración' },
] as const

export default function AdminUsuarios() {
  const { perfil } = useAuth()
  const { confirm, notify } = useAlert()
  const [tab, setTab] = useState<'usuarios' | 'perfiles' | 'areas' | 'competencias'>('usuarios')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [perfilesCatalogo, setPerfilesCatalogo] = useState<Perfil[]>([])
  const [areas, setAreas] = useState<Tables<'areas'>[]>([])
  const [competencias, setCompetencias] = useState<Tables<'competencias'>[]>([])
  const [modalUsuario, setModalUsuario] = useState(false)
  const [modalReset, setModalReset] = useState<Usuario | null>(null)
  const [nuevaPass, setNuevaPass] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ email: '', password: '', nombre: '', role: 'coordinador', area_id: '' })

  async function cargar() {
    const [{ data: u }, { data: pf }, { data: a }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('*, areas!profiles_area_id_fkey(nombre)').order('nombre'),
      supabase.from('perfiles').select('*').order('id'),
      supabase.from('areas').select('*').order('nombre'),
      supabase.from('competencias').select('*').order('nombre'),
    ])
    setUsuarios((u as any) ?? []); setPerfilesCatalogo(pf ?? []); setAreas(a ?? []); setCompetencias(c ?? [])
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
    setForm({ email: '', password: '', nombre: '', role: 'coordinador', area_id: '' })
    notify(`Se creó el usuario ${form.nombre || ''} correctamente.`, 'success', 'Usuario creado')
    cargar()
  }

  async function resetPassword() {
    if (!modalReset) return
    setGuardando(true)
    const { data: sesion } = await supabase.auth.getSession()
    const { error } = await supabase.functions.invoke('admin-usuarios', {
      body: { accion: 'reset', id: modalReset.id, password: nuevaPass },
      headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
    })
    setGuardando(false)
    const nombre = modalReset.nombre
    setModalReset(null); setNuevaPass('')
    if (error) notify('No se pudo restablecer la contraseña.', 'error')
    else notify(`Se restableció la contraseña de ${nombre}.`, 'success')
  }

  async function eliminarUsuario(u: Usuario) {
    const ok = await confirm(`¿Eliminar a ${u.nombre}? Esta acción no se puede deshacer.`, {
      titulo: 'Eliminar usuario', variante: 'peligro', textoConfirmar: 'Eliminar',
    })
    if (!ok) return
    const { data: sesion } = await supabase.auth.getSession()
    await supabase.functions.invoke('admin-usuarios', {
      body: { accion: 'eliminar', id: u.id },
      headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
    })
    notify(`Se eliminó a ${u.nombre}.`, 'success')
    cargar()
  }

  async function toggleActivo(u: Usuario) {
    await supabase.from('profiles').update({ activo: !u.activo }).eq('id', u.id)
    cargar()
  }

  async function togglePermisoPerfil(p: Perfil, campo: typeof PERMISOS_CATALOGO[number]['key']) {
    const nuevoValor = !p[campo]
    setPerfilesCatalogo((prev) => prev.map((x) => x.id === p.id ? { ...x, [campo]: nuevoValor } : x))
    const patch: TablesUpdate<'perfiles'> = { [campo]: nuevoValor }
    await supabase.from('perfiles').update(patch).eq('id', p.id)
  }

  if (perfil?.role !== 'admin' && !perfil?.perm_administracion) {
    return <p className="text-slate-500">No tienes permisos de administración.</p>
  }

  return (
    <div>
      <PageHeader titulo="Configuración" subtitulo="Usuarios, perfiles, áreas y competencias" />

      <div className="mb-4 flex gap-2 border-b border-slate-300 text-sm">
        {(['usuarios', 'perfiles', 'areas', 'competencias'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 font-medium capitalize ${tab === t ? 'border-b-2 border-brand text-brand' : 'text-slate-500'}`}>{t}</button>
        ))}
      </div>

      {tab === 'usuarios' && (
        <div>
          <div className="mb-3 flex justify-end">
            <Boton onClick={() => setModalUsuario(true)}><Plus size={15} className="mr-1 inline" />Nuevo Usuario</Boton>
          </div>
          <TableShell>
            <TableHead>
              <th>Nombre</th><th>Correo</th><th>Perfil</th><th>Área</th><th>Estado</th><th />
            </TableHead>
            <tbody>
              {usuarios.map((u, i) => (
                <tr key={u.id} className={filaZebra(i)}>
                  <td className="px-4 py-2.5">{u.nombre}</td>
                  <td className="px-4 py-2.5 text-slate-500">{u.email}</td>
                  <td className="px-4 py-2.5">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-2.5 text-slate-500">{u.areas?.nombre ?? '-'}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => toggleActivo(u)}>
                      <Badge texto={u.activo ? 'Activo' : 'Inactivo'} valor={u.activo ? 'aprobado' : 'rechazado'} />
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button title="Restablecer contraseña" onClick={() => setModalReset(u)} className="text-slate-400 hover:text-brand-light"><KeyRound size={15} /></button>
                      <button title="Eliminar" onClick={() => eliminarUsuario(u)} className="text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!usuarios.length && <TableEmpty colSpan={6}>No hay usuarios registrados</TableEmpty>}
            </tbody>
          </TableShell>
        </div>
      )}

      {tab === 'perfiles' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">
            Define el nivel de acceso de cada perfil. Los cambios aplican a los usuarios nuevos y a los existentes
            que no tengan permisos personalizados en su ficha (Perfil de Usuario).
          </p>
          <TableShell>
            <TableHead>
              <th>Perfil</th>
              {PERMISOS_CATALOGO.map((p) => <th key={p.key}>{p.label}</th>)}
            </TableHead>
            <tbody>
              {perfilesCatalogo.map((p, i) => (
                <tr key={p.id} className={filaZebra(i)}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-700">{p.nombre}</p>
                    <p className="text-xs text-slate-400">{p.descripcion}</p>
                  </td>
                  {PERMISOS_CATALOGO.map((perm) => (
                    <td key={perm.key} className="px-4 py-2.5 text-center">
                      <input type="checkbox" checked={!!(p as any)[perm.key]}
                        onChange={() => togglePermisoPerfil(p, perm.key)}
                        disabled={p.codigo === 'admin'} />
                    </td>
                  ))}
                </tr>
              ))}
              {!perfilesCatalogo.length && <TableEmpty colSpan={PERMISOS_CATALOGO.length + 1}>Sin perfiles registrados</TableEmpty>}
            </tbody>
          </TableShell>
        </div>
      )}

      {tab === 'areas' && (
        <TableShell>
          <TableHead><th>Nombre</th><th>Código</th><th>Estado</th></TableHead>
          <tbody>
            {areas.map((a, i) => (
              <tr key={a.id} className={filaZebra(i)}>
                <td className="px-4 py-2.5">{a.nombre}</td><td className="px-4 py-2.5 text-slate-500">{a.codigo}</td>
                <td className="px-4 py-2.5"><Badge texto={a.activo ? 'Activo' : 'Inactivo'} valor={a.activo ? 'aprobado' : 'rechazado'} /></td>
              </tr>
            ))}
            {!areas.length && <TableEmpty colSpan={3}>Sin áreas registradas</TableEmpty>}
          </tbody>
        </TableShell>
      )}

      {tab === 'competencias' && (
        <TableShell>
          <TableHead><th>Nombre</th><th>Tipo</th><th>Peso Defecto</th></TableHead>
          <tbody>
            {competencias.map((c, i) => (
              <tr key={c.id} className={filaZebra(i)}>
                <td className="px-4 py-2.5">{c.nombre}</td><td className="px-4 py-2.5 capitalize text-slate-500">{c.tipo}</td><td className="px-4 py-2.5 text-slate-500">{c.peso_defecto}%</td>
              </tr>
            ))}
            {!competencias.length && <TableEmpty colSpan={3}>Sin competencias registradas</TableEmpty>}
          </tbody>
        </TableShell>
      )}

      <Modal open={modalUsuario} onClose={() => setModalUsuario(false)} titulo="Nuevo Usuario" ancho="max-w-lg">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Nombre completo" className="sm:col-span-2" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Input label="Correo institucional" type="email" className="sm:col-span-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Contraseña temporal" type="text" className="sm:col-span-2" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select label="Perfil" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {perfilesCatalogo.map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
          </Select>
          <Select label="Área" value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
            <option value="">Sin asignar</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        </div>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Boton variante="secundario" onClick={() => setModalUsuario(false)}>Cancelar</Boton>
          <Boton disabled={guardando} onClick={crearUsuario}>{guardando ? 'Creando…' : 'Crear Usuario'}</Boton>
        </div>
      </Modal>

      <Modal open={!!modalReset} onClose={() => setModalReset(null)} titulo={`Restablecer contraseña · ${modalReset?.nombre}`} ancho="max-w-sm">
        <div className="flex flex-col gap-3">
          <Input label="Nueva contraseña" value={nuevaPass} onChange={(e) => setNuevaPass(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModalReset(null)}>Cancelar</Boton>
            <Boton disabled={guardando || !nuevaPass} onClick={resetPassword}>{guardando ? 'Guardando…' : 'Restablecer'}</Boton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
