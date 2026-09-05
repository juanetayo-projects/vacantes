import { useEffect, useState } from 'react'
import { Plus, KeyRound, Trash2, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth, ROLE_LABELS } from '../../lib/auth'
import { PageHeader, Boton, Modal, Input, Select, Badge, TableShell, TableHead, TableEmpty, filaZebra } from '../../components/ui'
import { useAlert } from '../../lib/alerts'
import type { Tables, TablesUpdate } from '../../lib/database.types'

type Usuario = Tables<'profiles'> & { areas: { nombre: string } | null; procesos: { nombre: string } | null }
type Perfil = Tables<'perfiles'>
type Area = Tables<'areas'>
type Competencia = Tables<'competencias'>
type Proceso = Tables<'procesos'>

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
  const [tab, setTab] = useState<'usuarios' | 'perfiles' | 'areas' | 'procesos' | 'competencias'>('usuarios')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [perfilesCatalogo, setPerfilesCatalogo] = useState<Perfil[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [competencias, setCompetencias] = useState<Competencia[]>([])
  const [modalUsuario, setModalUsuario] = useState(false)
  const [modalEditar, setModalEditar] = useState<Usuario | null>(null)
  const [modalReset, setModalReset] = useState<Usuario | null>(null)
  const [modalArea, setModalArea] = useState<Area | 'nueva' | null>(null)
  const [modalProceso, setModalProceso] = useState<Proceso | 'nueva' | null>(null)
  const [modalCompetencia, setModalCompetencia] = useState<Competencia | 'nueva' | null>(null)
  const [nuevaPass, setNuevaPass] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ email: '', password: '', nombre: '', role: 'coordinador', area_id: '', proceso_id: '' })
  const [formEditar, setFormEditar] = useState({ nombre: '', role: 'coordinador', area_id: '', proceso_id: '' })
  const [formArea, setFormArea] = useState({ nombre: '', codigo: '', activo: true })
  const [formProceso, setFormProceso] = useState({ nombre: '', correo: '', activo: true })
  const [formCompetencia, setFormCompetencia] = useState({ nombre: '', tipo: 'tecnica', peso_defecto: '' })

  const puedeAdministrar = perfil?.role === 'admin' || !!perfil?.perm_configuracion

  async function cargar() {
    const [{ data: u }, { data: pf }, { data: a }, { data: pr }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('*, areas!profiles_area_id_fkey(nombre), procesos(nombre)').order('nombre'),
      supabase.from('perfiles').select('*').order('id'),
      supabase.from('areas').select('*').order('nombre'),
      supabase.from('procesos').select('*').order('orden'),
      supabase.from('competencias').select('*').order('nombre'),
    ])
    setUsuarios((u as any) ?? []); setPerfilesCatalogo(pf ?? []); setAreas(a ?? []); setProcesos(pr ?? []); setCompetencias(c ?? [])
  }

  useEffect(() => { cargar() }, [])

  async function crearUsuario() {
    setError(''); setGuardando(true)
    const { data: sesion } = await supabase.auth.getSession()
    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: { accion: 'crear', ...form, area_id: form.area_id ? Number(form.area_id) : null, proceso_id: form.proceso_id ? Number(form.proceso_id) : null },
      headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
    })
    setGuardando(false)
    if (error || data?.error) { setError(data?.error ?? error?.message ?? 'Error al crear usuario'); return }
    setModalUsuario(false)
    setForm({ email: '', password: '', nombre: '', role: 'coordinador', area_id: '', proceso_id: '' })
    notify(`Se creó el usuario ${form.nombre || ''} correctamente.`, 'success', 'Usuario creado')
    cargar()
  }

  function abrirEditar(u: Usuario) {
    setFormEditar({ nombre: u.nombre, role: u.role, area_id: u.area_id ? String(u.area_id) : '', proceso_id: u.proceso_id ? String(u.proceso_id) : '' })
    setModalEditar(u)
  }

  async function guardarEdicion() {
    if (!modalEditar) return
    setGuardando(true)
    const plantilla = perfilesCatalogo.find((p) => p.codigo === formEditar.role)
    const cambioPerfil = formEditar.role !== modalEditar.role
    const { error } = await supabase.from('profiles').update({
      nombre: formEditar.nombre,
      area_id: formEditar.area_id ? Number(formEditar.area_id) : null,
      proceso_id: formEditar.proceso_id ? Number(formEditar.proceso_id) : null,
      role: formEditar.role as Usuario['role'],
      ...(cambioPerfil && plantilla ? {
        perfil_id: plantilla.id,
        ve_todas_areas: plantilla.ve_todas_areas,
        perm_gestion_vacantes: plantilla.perm_gestion_vacantes,
        perm_aprobaciones: plantilla.perm_aprobaciones,
        perm_reportes: plantilla.perm_reportes,
        perm_administracion: plantilla.perm_administracion,
        perm_configuracion: plantilla.perm_configuracion,
      } : {}),
    }).eq('id', modalEditar.id)
    setGuardando(false)
    if (error) { notify('No se pudo guardar el usuario.', 'error'); return }
    notify('Usuario actualizado correctamente.', 'success')
    setModalEditar(null)
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

  // --- Áreas: CRUD ---
  function abrirArea(a: Area | 'nueva') {
    setFormArea(a === 'nueva' ? { nombre: '', codigo: '', activo: true } : { nombre: a.nombre, codigo: a.codigo, activo: a.activo })
    setModalArea(a)
  }

  async function guardarArea() {
    setGuardando(true)
    const error = modalArea === 'nueva'
      ? (await supabase.from('areas').insert(formArea)).error
      : (await supabase.from('areas').update(formArea).eq('id', (modalArea as Area).id)).error
    setGuardando(false)
    if (error) { notify('No se pudo guardar el área.', 'error'); return }
    notify('Área guardada correctamente.', 'success')
    setModalArea(null)
    cargar()
  }

  async function eliminarArea(a: Area) {
    const ok = await confirm(`¿Eliminar el área "${a.nombre}"? Si tiene vacantes o usuarios asociados, la operación fallará.`, {
      titulo: 'Eliminar área', variante: 'peligro', textoConfirmar: 'Eliminar',
    })
    if (!ok) return
    const { error } = await supabase.from('areas').delete().eq('id', a.id)
    if (error) notify('No se pudo eliminar: probablemente tiene vacantes o usuarios asociados. Puedes marcarla como Inactiva en su lugar.', 'error')
    else { notify(`Se eliminó el área ${a.nombre}.`, 'success'); cargar() }
  }

  // --- Procesos: CRUD ---
  function abrirProceso(p: Proceso | 'nueva') {
    setFormProceso(p === 'nueva' ? { nombre: '', correo: '', activo: true } : { nombre: p.nombre, correo: p.correo ?? '', activo: p.activo })
    setModalProceso(p)
  }

  async function guardarProceso() {
    setGuardando(true)
    const error = modalProceso === 'nueva'
      ? (await supabase.from('procesos').insert(formProceso)).error
      : (await supabase.from('procesos').update(formProceso).eq('id', (modalProceso as Proceso).id)).error
    setGuardando(false)
    if (error) { notify('No se pudo guardar el proceso.', 'error'); return }
    notify('Proceso guardado correctamente.', 'success')
    setModalProceso(null)
    cargar()
  }

  async function eliminarProceso(p: Proceso) {
    const ok = await confirm(`¿Eliminar el proceso "${p.nombre}"? Si tiene vacantes o usuarios asociados, la operación fallará.`, {
      titulo: 'Eliminar proceso', variante: 'peligro', textoConfirmar: 'Eliminar',
    })
    if (!ok) return
    const { error } = await supabase.from('procesos').delete().eq('id', p.id)
    if (error) notify('No se pudo eliminar: probablemente tiene vacantes o usuarios asociados. Puedes marcarlo como Inactivo en su lugar.', 'error')
    else { notify(`Se eliminó el proceso ${p.nombre}.`, 'success'); cargar() }
  }

  // --- Competencias: CRUD ---
  function abrirCompetencia(c: Competencia | 'nueva') {
    setFormCompetencia(c === 'nueva' ? { nombre: '', tipo: 'tecnica', peso_defecto: '' } : { nombre: c.nombre, tipo: c.tipo, peso_defecto: String(c.peso_defecto ?? '') })
    setModalCompetencia(c)
  }

  async function guardarCompetencia() {
    setGuardando(true)
    const payload = { nombre: formCompetencia.nombre, tipo: formCompetencia.tipo, peso_defecto: formCompetencia.peso_defecto ? Number(formCompetencia.peso_defecto) : 0 }
    const error = modalCompetencia === 'nueva'
      ? (await supabase.from('competencias').insert(payload)).error
      : (await supabase.from('competencias').update(payload).eq('id', (modalCompetencia as Competencia).id)).error
    setGuardando(false)
    if (error) { notify('No se pudo guardar la competencia.', 'error'); return }
    notify('Competencia guardada correctamente.', 'success')
    setModalCompetencia(null)
    cargar()
  }

  async function eliminarCompetencia(c: Competencia) {
    const ok = await confirm(`¿Eliminar la competencia "${c.nombre}"?`, {
      titulo: 'Eliminar competencia', variante: 'peligro', textoConfirmar: 'Eliminar',
    })
    if (!ok) return
    const { error } = await supabase.from('competencias').delete().eq('id', c.id)
    if (error) notify('No se pudo eliminar: probablemente está en uso en alguna vacante o evaluación.', 'error')
    else { notify(`Se eliminó la competencia ${c.nombre}.`, 'success'); cargar() }
  }

  if (!puedeAdministrar) {
    return <p className="text-slate-500">No tienes permisos de administración.</p>
  }

  return (
    <div>
      <PageHeader titulo="Configuración" subtitulo="Usuarios, perfiles, áreas y competencias" />

      <div className="mb-4 flex gap-2 border-b border-slate-300 text-sm">
        {(['usuarios', 'perfiles', 'areas', 'procesos', 'competencias'] as const).map((t) => (
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
              <th>Nombre</th><th>Correo</th><th>Perfil</th><th>Área</th><th>Proceso</th><th>Estado</th><th />
            </TableHead>
            <tbody>
              {usuarios.map((u, i) => (
                <tr key={u.id} className={filaZebra(i)}>
                  <td className="px-4 py-2.5">{u.nombre}</td>
                  <td className="px-4 py-2.5 text-slate-500">{u.email}</td>
                  <td className="px-4 py-2.5">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-2.5 text-slate-500">{u.areas?.nombre ?? '-'}</td>
                  <td className="px-4 py-2.5 text-slate-500">{u.procesos?.nombre ?? '-'}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => toggleActivo(u)}>
                      <Badge texto={u.activo ? 'Activo' : 'Inactivo'} valor={u.activo ? 'aprobado' : 'rechazado'} />
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button title="Editar" onClick={() => abrirEditar(u)} className="text-slate-400 hover:text-brand-light"><Pencil size={15} /></button>
                      <button title="Restablecer contraseña" onClick={() => setModalReset(u)} className="text-slate-400 hover:text-brand-light"><KeyRound size={15} /></button>
                      <button title="Eliminar" onClick={() => eliminarUsuario(u)} className="text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!usuarios.length && <TableEmpty colSpan={7}>No hay usuarios registrados</TableEmpty>}
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
        <div>
          <div className="mb-3 flex justify-end">
            <Boton onClick={() => abrirArea('nueva')}><Plus size={15} className="mr-1 inline" />Nueva Área</Boton>
          </div>
          <TableShell>
            <TableHead><th>Nombre</th><th>Código</th><th>Estado</th><th /></TableHead>
            <tbody>
              {areas.map((a, i) => (
                <tr key={a.id} className={filaZebra(i)}>
                  <td className="px-4 py-2.5">{a.nombre}</td><td className="px-4 py-2.5 text-slate-500">{a.codigo}</td>
                  <td className="px-4 py-2.5"><Badge texto={a.activo ? 'Activo' : 'Inactivo'} valor={a.activo ? 'aprobado' : 'rechazado'} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button title="Editar" onClick={() => abrirArea(a)} className="text-slate-400 hover:text-brand-light"><Pencil size={15} /></button>
                      <button title="Eliminar" onClick={() => eliminarArea(a)} className="text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!areas.length && <TableEmpty colSpan={4}>Sin áreas registradas</TableEmpty>}
            </tbody>
          </TableShell>
        </div>
      )}

      {tab === 'procesos' && (
        <div>
          <div className="mb-3 flex justify-end">
            <Boton onClick={() => abrirProceso('nueva')}><Plus size={15} className="mr-1 inline" />Nuevo Proceso</Boton>
          </div>
          <TableShell>
            <TableHead><th>Nombre</th><th>Correo Responsable</th><th>Estado</th><th /></TableHead>
            <tbody>
              {procesos.map((p, i) => (
                <tr key={p.id} className={filaZebra(i)}>
                  <td className="px-4 py-2.5">{p.nombre}</td><td className="px-4 py-2.5 text-slate-500">{p.correo ?? '-'}</td>
                  <td className="px-4 py-2.5"><Badge texto={p.activo ? 'Activo' : 'Inactivo'} valor={p.activo ? 'aprobado' : 'rechazado'} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button title="Editar" onClick={() => abrirProceso(p)} className="text-slate-400 hover:text-brand-light"><Pencil size={15} /></button>
                      <button title="Eliminar" onClick={() => eliminarProceso(p)} className="text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!procesos.length && <TableEmpty colSpan={4}>Sin procesos registrados</TableEmpty>}
            </tbody>
          </TableShell>
        </div>
      )}

      {tab === 'competencias' && (
        <div>
          <div className="mb-3 flex justify-end">
            <Boton onClick={() => abrirCompetencia('nueva')}><Plus size={15} className="mr-1 inline" />Nueva Competencia</Boton>
          </div>
          <TableShell>
            <TableHead><th>Nombre</th><th>Tipo</th><th>Peso Defecto</th><th /></TableHead>
            <tbody>
              {competencias.map((c, i) => (
                <tr key={c.id} className={filaZebra(i)}>
                  <td className="px-4 py-2.5">{c.nombre}</td><td className="px-4 py-2.5 capitalize text-slate-500">{c.tipo}</td><td className="px-4 py-2.5 text-slate-500">{c.peso_defecto}%</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button title="Editar" onClick={() => abrirCompetencia(c)} className="text-slate-400 hover:text-brand-light"><Pencil size={15} /></button>
                      <button title="Eliminar" onClick={() => eliminarCompetencia(c)} className="text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!competencias.length && <TableEmpty colSpan={4}>Sin competencias registradas</TableEmpty>}
            </tbody>
          </TableShell>
        </div>
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
          <Select label="Proceso" value={form.proceso_id} onChange={(e) => setForm({ ...form, proceso_id: e.target.value })}>
            <option value="">Sin asignar</option>
            {procesos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </div>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Boton variante="secundario" onClick={() => setModalUsuario(false)}>Cancelar</Boton>
          <Boton disabled={guardando} onClick={crearUsuario}>{guardando ? 'Creando…' : 'Crear Usuario'}</Boton>
        </div>
      </Modal>

      <Modal open={!!modalEditar} onClose={() => setModalEditar(null)} titulo={`Editar Usuario · ${modalEditar?.nombre}`} ancho="max-w-lg">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Nombre completo" className="sm:col-span-2" value={formEditar.nombre}
            onChange={(e) => setFormEditar({ ...formEditar, nombre: e.target.value })} />
          <Input label="Correo institucional" className="sm:col-span-2" value={modalEditar?.email ?? ''} disabled />
          <Select label="Perfil" value={formEditar.role} onChange={(e) => setFormEditar({ ...formEditar, role: e.target.value })}>
            {perfilesCatalogo.map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
          </Select>
          <Select label="Área" value={formEditar.area_id} onChange={(e) => setFormEditar({ ...formEditar, area_id: e.target.value })}>
            <option value="">Sin asignar</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
          <Select label="Proceso" value={formEditar.proceso_id} onChange={(e) => setFormEditar({ ...formEditar, proceso_id: e.target.value })}>
            <option value="">Sin asignar</option>
            {procesos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Boton variante="secundario" onClick={() => setModalEditar(null)}>Cancelar</Boton>
          <Boton disabled={guardando} onClick={guardarEdicion}>{guardando ? 'Guardando…' : 'Guardar Cambios'}</Boton>
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

      <Modal open={!!modalArea} onClose={() => setModalArea(null)} titulo={modalArea === 'nueva' ? 'Nueva Área' : `Editar Área · ${(modalArea as Area)?.nombre}`} ancho="max-w-sm">
        <div className="flex flex-col gap-3">
          <Input label="Nombre" value={formArea.nombre} onChange={(e) => setFormArea({ ...formArea, nombre: e.target.value })} />
          <Input label="Código" value={formArea.codigo} onChange={(e) => setFormArea({ ...formArea, codigo: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={formArea.activo} onChange={(e) => setFormArea({ ...formArea, activo: e.target.checked })} />
            Activa
          </label>
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModalArea(null)}>Cancelar</Boton>
            <Boton disabled={guardando} onClick={guardarArea}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
          </div>
        </div>
      </Modal>

      <Modal open={!!modalProceso} onClose={() => setModalProceso(null)} titulo={modalProceso === 'nueva' ? 'Nuevo Proceso' : `Editar Proceso · ${(modalProceso as Proceso)?.nombre}`} ancho="max-w-sm">
        <div className="flex flex-col gap-3">
          <Input label="Nombre" value={formProceso.nombre} onChange={(e) => setFormProceso({ ...formProceso, nombre: e.target.value })} />
          <Input label="Correo responsable" value={formProceso.correo} onChange={(e) => setFormProceso({ ...formProceso, correo: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={formProceso.activo} onChange={(e) => setFormProceso({ ...formProceso, activo: e.target.checked })} />
            Activo
          </label>
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModalProceso(null)}>Cancelar</Boton>
            <Boton disabled={guardando} onClick={guardarProceso}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
          </div>
        </div>
      </Modal>

      <Modal open={!!modalCompetencia} onClose={() => setModalCompetencia(null)} titulo={modalCompetencia === 'nueva' ? 'Nueva Competencia' : `Editar Competencia · ${(modalCompetencia as Competencia)?.nombre}`} ancho="max-w-sm">
        <div className="flex flex-col gap-3">
          <Input label="Nombre" value={formCompetencia.nombre} onChange={(e) => setFormCompetencia({ ...formCompetencia, nombre: e.target.value })} />
          <Select label="Tipo" value={formCompetencia.tipo} onChange={(e) => setFormCompetencia({ ...formCompetencia, tipo: e.target.value })}>
            <option value="tecnica">Técnica</option>
            <option value="conductual">Conductual</option>
          </Select>
          <Input label="Peso por defecto (%)" type="number" value={formCompetencia.peso_defecto}
            onChange={(e) => setFormCompetencia({ ...formCompetencia, peso_defecto: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModalCompetencia(null)}>Cancelar</Boton>
            <Boton disabled={guardando} onClick={guardarCompetencia}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
