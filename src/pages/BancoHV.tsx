import { useEffect, useState } from 'react'
import { Search, FileText, Send, Plus, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAlert } from '../lib/alerts'
import { PageHeader, FilterBar, Boton, Modal, Input, Select, Textarea, Badge, TableShell, TableHead, TableEmpty, filaZebra } from '../components/ui'
import { formatoFecha } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Candidato = Tables<'candidatos'> & { areas: { nombre: string } | null }
type Vacante = Tables<'vacantes'>
type Area = Tables<'areas'>

const FUENTE_LABELS: Record<string, string> = {
  autopostulacion: 'Autopostulación',
  portal_empleo: 'Portal de Empleo',
  referido: 'Referido',
  linkedin: 'LinkedIn',
  pagina_web: 'Página Web',
  otros: 'Otros',
}

function leerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const FORM_VACIO = {
  nombre: '', tipo_documento: 'CC', numero_documento: '', email: '', telefono: '',
  area_interes_id: '', cargo_interes: '', formacion: '', experiencia_anios: '', habilidades: '', fuente: 'referido' as Tables<'candidatos'>['fuente'],
}

export default function BancoHV() {
  const { notify } = useAlert()
  const [busqueda, setBusqueda] = useState('')
  const [filtroFuente, setFiltroFuente] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<Candidato[]>([])
  const [vacantesActivas, setVacantesActivas] = useState<Vacante[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [modalPostular, setModalPostular] = useState<Candidato | null>(null)
  const [vacanteSeleccionada, setVacanteSeleccionada] = useState('')
  const [postulando, setPostulando] = useState(false)

  const [modalNuevo, setModalNuevo] = useState(false)
  const [formNuevo, setFormNuevo] = useState(FORM_VACIO)
  const [cvNuevo, setCvNuevo] = useState<File | null>(null)
  const [guardandoNuevo, setGuardandoNuevo] = useState(false)

  async function buscar() {
    setBuscando(true)
    let q = supabase.from('candidatos').select('*, areas!candidatos_area_interes_id_fkey(nombre)')
    const b = busqueda.trim()
    if (b) q = q.or(`nombre.ilike.%${b}%,formacion.ilike.%${b}%,numero_documento.ilike.%${b}%,telefono.ilike.%${b}%,email.ilike.%${b}%,cargo_interes.ilike.%${b}%`)
    if (filtroFuente) q = q.eq('fuente', filtroFuente as NonNullable<Candidato['fuente']>)
    if (filtroArea) q = q.eq('area_interes_id', Number(filtroArea))
    if (filtroDesde) q = q.gte('created_at', filtroDesde)
    if (filtroHasta) q = q.lt('created_at', new Date(new Date(filtroHasta).getTime() + 86400000).toISOString().slice(0, 10))
    const { data } = await q.order('created_at', { ascending: false }).limit(50)
    setResultados((data as any) ?? [])
    setBuscando(false)
  }

  useEffect(() => {
    supabase.from('vacantes').select('*').in('estado', ['publicada', 'en_evaluacion']).order('cargo')
      .then(({ data }) => setVacantesActivas(data ?? []))
    supabase.from('areas').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setAreas(data ?? []))
  }, [])

  useEffect(() => { buscar() }, [filtroFuente, filtroArea, filtroDesde, filtroHasta])

  async function verHojaDeVida(c: Candidato) {
    if (!c.hoja_vida_url) { notify('Este candidato no tiene hoja de vida adjunta.', 'info'); return }
    const { data: sesion } = await supabase.auth.getSession()
    const { data, error } = await supabase.functions.invoke('portal-candidato', {
      body: { accion: 'firmar_documento', path: c.hoja_vida_url },
      headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
    })
    if (error || data?.error) { notify('No se pudo generar el enlace del documento.', 'error'); return }
    window.open(data.url, '_blank')
  }

  function abrirPostular(c: Candidato) {
    setVacanteSeleccionada('')
    setModalPostular(c)
  }

  async function confirmarPostular() {
    if (!modalPostular || !vacanteSeleccionada) return
    setPostulando(true)
    const { data: existente } = await supabase.from('postulaciones').select('id')
      .eq('candidato_id', modalPostular.id).eq('vacante_id', Number(vacanteSeleccionada)).maybeSingle()
    if (existente) {
      notify('Este candidato ya está postulado a esa vacante.', 'warning')
    } else {
      await supabase.from('postulaciones').insert({ candidato_id: modalPostular.id, vacante_id: Number(vacanteSeleccionada), estado: 'postulado' })
      notify(`${modalPostular.nombre} se agregó a Postulados en esa vacante.`, 'success')
    }
    setPostulando(false)
    setModalPostular(null)
  }

  function abrirNuevo() {
    setFormNuevo(FORM_VACIO)
    setCvNuevo(null)
    setModalNuevo(true)
  }

  function setCampoNuevo(campo: keyof typeof formNuevo, valor: string) {
    setFormNuevo((f) => ({ ...f, [campo]: valor }))
  }

  async function subirCV(candidatoId: number) {
    const { data: sesion } = await supabase.auth.getSession()
    const { data, error } = await supabase.functions.invoke('portal-candidato', {
      body: { accion: 'subir_hoja_de_vida_staff', candidatoId, cvBase64: await leerComoBase64(cvNuevo!), cvNombreArchivo: cvNuevo!.name },
      headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
    })
    if (error || data?.error) notify(`El candidato se guardó, pero no se pudo subir la hoja de vida: ${data?.error ?? error?.message}`, 'warning')
  }

  async function guardarNuevo() {
    if (!formNuevo.nombre.trim()) { notify('El nombre es obligatorio.', 'error'); return }
    setGuardandoNuevo(true)
    const datos = {
      nombre: formNuevo.nombre, tipo_documento: formNuevo.numero_documento.trim() ? formNuevo.tipo_documento : null,
      numero_documento: formNuevo.numero_documento.trim() || null, email: formNuevo.email || null, telefono: formNuevo.telefono || null,
      formacion: formNuevo.formacion || null, experiencia_anios: formNuevo.experiencia_anios ? Number(formNuevo.experiencia_anios) : null,
      cargo_interes: formNuevo.cargo_interes || null, area_interes_id: formNuevo.area_interes_id ? Number(formNuevo.area_interes_id) : null,
      habilidades: formNuevo.habilidades || null,
    }

    let candidatoId: number | undefined
    if (datos.numero_documento) {
      const { data: existente } = await supabase.from('candidatos').select('id, nombre')
        .eq('numero_documento', datos.numero_documento).maybeSingle()
      if (existente) {
        candidatoId = existente.id
        await supabase.from('candidatos').update(datos).eq('id', candidatoId)
        notify(`${existente.nombre} ya estaba en el banco con ese documento; se actualizó su información.`, 'info')
      }
    }
    if (candidatoId === undefined) {
      const { data: nuevo, error } = await supabase.from('candidatos').insert({ ...datos, fuente: formNuevo.fuente }).select('id').single()
      if (error) { notify('No se pudo registrar el candidato.', 'error'); setGuardandoNuevo(false); return }
      candidatoId = nuevo.id
    }

    if (cvNuevo) await subirCV(candidatoId)

    setGuardandoNuevo(false)
    setModalNuevo(false)
    notify('Candidato registrado en el Banco de HV.', 'success')
    buscar()
  }

  return (
    <div>
      <PageHeader titulo="Banco de Hojas de Vida" subtitulo="Candidatos disponibles, incluidas las autopostulaciones públicas"
        acciones={<Boton onClick={abrirNuevo}><Plus size={15} className="mr-1 inline" />Registrar Candidato</Boton>} />

      <FilterBar>
        <Input label="Buscar" placeholder="Nombre, documento, teléfono, correo, formación o cargo…" value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), buscar())} className="w-64" />
        <Select label="Fuente" value={filtroFuente} onChange={(e) => setFiltroFuente(e.target.value)}>
          <option value="">Todas las fuentes</option>
          {Object.entries(FUENTE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select label="Área de interés" value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </Select>
        <Input label="Ingresó desde" type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} />
        <Input label="Hasta" type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} />
        <Boton onClick={buscar} disabled={buscando}><Search size={15} className="mr-1 inline" />{buscando ? 'Buscando…' : 'Buscar'}</Boton>
      </FilterBar>

      <TableShell>
        <TableHead>
          <th>Candidato</th><th>Contacto</th><th>Formación / Interés</th><th>Fuente</th><th>Ingresó</th><th />
        </TableHead>
        <tbody>
          {resultados.map((c, i) => (
            <tr key={c.id} className={filaZebra(i)}>
              <td className="px-4 py-2.5">
                <p className="font-medium text-slate-700">{c.nombre}</p>
                {c.numero_documento && <p className="text-xs text-slate-400">{c.tipo_documento} {c.numero_documento}</p>}
              </td>
              <td className="px-4 py-2.5 text-slate-500">
                <p>{c.email ?? '-'}</p>
                <p className="text-xs">{c.telefono ?? ''}</p>
              </td>
              <td className="px-4 py-2.5 text-slate-500">
                <p>{c.formacion ?? '-'}</p>
                <p className="text-xs">{c.cargo_interes ?? c.areas?.nombre ?? ''}</p>
              </td>
              <td className="px-4 py-2.5"><Badge texto={FUENTE_LABELS[c.fuente ?? ''] ?? c.fuente ?? '-'} valor={c.fuente === 'autopostulacion' ? 'aprobado' : undefined} /></td>
              <td className="px-4 py-2.5 text-slate-500">{formatoFecha(c.created_at)}</td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex justify-end gap-3">
                  <button title="Ver hoja de vida" onClick={() => verHojaDeVida(c)} className="text-slate-400 hover:text-brand-light"><FileText size={16} /></button>
                  <button title="Postular a una vacante" onClick={() => abrirPostular(c)} className="text-slate-400 hover:text-brand-light"><Send size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
          {!buscando && !resultados.length && <TableEmpty colSpan={6}>No se encontraron candidatos.</TableEmpty>}
        </tbody>
      </TableShell>

      <Modal open={!!modalPostular} onClose={() => setModalPostular(null)} titulo={`Postular a vacante · ${modalPostular?.nombre}`} ancho="max-w-sm">
        <div className="flex flex-col gap-3">
          <Select label="Vacante" value={vacanteSeleccionada} onChange={(e) => setVacanteSeleccionada(e.target.value)}>
            <option value="">Selecciona una vacante…</option>
            {vacantesActivas.map((v) => <option key={v.id} value={v.id}>{v.cargo} · {v.codigo}</option>)}
          </Select>
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModalPostular(null)}>Cancelar</Boton>
            <Boton disabled={!vacanteSeleccionada || postulando} onClick={confirmarPostular}>{postulando ? 'Guardando…' : 'Postular'}</Boton>
          </div>
        </div>
      </Modal>

      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} titulo="Registrar Candidato" ancho="max-w-lg">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Nombre completo" className="sm:col-span-2" value={formNuevo.nombre} onChange={(e) => setCampoNuevo('nombre', e.target.value)} required />
          <div className="flex gap-2">
            <div className="w-24">
              <Select label="Tipo doc." value={formNuevo.tipo_documento} onChange={(e) => setCampoNuevo('tipo_documento', e.target.value)}>
                <option value="CC">CC</option><option value="CE">CE</option><option value="TI">TI</option><option value="PA">PA</option>
              </Select>
            </div>
            <div className="flex-1">
              <Input label="Número de documento" value={formNuevo.numero_documento} onChange={(e) => setCampoNuevo('numero_documento', e.target.value)} />
            </div>
          </div>
          <Select label="Fuente" value={formNuevo.fuente ?? 'referido'} onChange={(e) => setCampoNuevo('fuente', e.target.value)}>
            <option value="portal_empleo">Correo de vacantes</option>
            <option value="referido">Referido</option>
            <option value="linkedin">LinkedIn</option>
            <option value="pagina_web">Página Web</option>
            <option value="otros">Otros</option>
          </Select>
          <Input label="Correo" type="email" value={formNuevo.email} onChange={(e) => setCampoNuevo('email', e.target.value)} />
          <Input label="Teléfono" value={formNuevo.telefono} onChange={(e) => setCampoNuevo('telefono', e.target.value)} />
          <Select label="Área de interés" value={formNuevo.area_interes_id} onChange={(e) => setCampoNuevo('area_interes_id', e.target.value)}>
            <option value="">Sin especificar</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
          <Input label="Cargo de interés" value={formNuevo.cargo_interes} onChange={(e) => setCampoNuevo('cargo_interes', e.target.value)} />
          <Input label="Formación" value={formNuevo.formacion} onChange={(e) => setCampoNuevo('formacion', e.target.value)} />
          <Input label="Años de experiencia" type="number" min={0} value={formNuevo.experiencia_anios} onChange={(e) => setCampoNuevo('experiencia_anios', e.target.value)} />
          <Textarea label="Habilidades / certificaciones" className="sm:col-span-2" rows={2} value={formNuevo.habilidades} onChange={(e) => setCampoNuevo('habilidades', e.target.value)} />
          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2">
            <span className="text-slate-600">Hoja de vida (PDF)</span>
            <span className="flex items-center gap-1 text-xs font-medium text-brand-light">
              <Upload size={13} /> {cvNuevo?.name.slice(0, 20) ?? 'Adjuntar'}
            </span>
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setCvNuevo(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Boton variante="secundario" onClick={() => setModalNuevo(false)}>Cancelar</Boton>
          <Boton disabled={guardandoNuevo} onClick={guardarNuevo}>{guardandoNuevo ? 'Guardando…' : 'Registrar'}</Boton>
        </div>
      </Modal>
    </div>
  )
}
