import { useEffect, useState } from 'react'
import { Search, FileText, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAlert } from '../lib/alerts'
import { PageHeader, Card, Boton, Modal, Select, Badge, TableShell, TableHead, TableEmpty, filaZebra } from '../components/ui'
import { formatoFecha } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Candidato = Tables<'candidatos'> & { areas: { nombre: string } | null }
type Vacante = Tables<'vacantes'>

const FUENTE_LABELS: Record<string, string> = {
  autopostulacion: 'Autopostulación',
  portal_empleo: 'Portal de Empleo',
  referido: 'Referido',
  linkedin: 'LinkedIn',
  pagina_web: 'Página Web',
  otros: 'Otros',
}

export default function BancoHV() {
  const { notify } = useAlert()
  const [busqueda, setBusqueda] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<Candidato[]>([])
  const [vacantesActivas, setVacantesActivas] = useState<Vacante[]>([])
  const [modalPostular, setModalPostular] = useState<Candidato | null>(null)
  const [vacanteSeleccionada, setVacanteSeleccionada] = useState('')
  const [postulando, setPostulando] = useState(false)

  async function cargarRecientes() {
    setBuscando(true)
    const { data } = await supabase.from('candidatos').select('*, areas!candidatos_area_interes_id_fkey(nombre)')
      .order('created_at', { ascending: false }).limit(30)
    setResultados((data as any) ?? [])
    setBuscando(false)
  }

  useEffect(() => {
    cargarRecientes()
    supabase.from('vacantes').select('*').in('estado', ['publicada', 'en_evaluacion']).order('cargo')
      .then(({ data }) => setVacantesActivas(data ?? []))
  }, [])

  async function buscar() {
    const b = busqueda.trim()
    if (!b) { cargarRecientes(); return }
    setBuscando(true)
    const { data } = await supabase.from('candidatos').select('*, areas!candidatos_area_interes_id_fkey(nombre)')
      .or(`nombre.ilike.%${b}%,formacion.ilike.%${b}%,numero_documento.ilike.%${b}%,telefono.ilike.%${b}%,email.ilike.%${b}%,cargo_interes.ilike.%${b}%`)
      .order('created_at', { ascending: false }).limit(50)
    setResultados((data as any) ?? [])
    setBuscando(false)
  }

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

  return (
    <div>
      <PageHeader titulo="Banco de Hojas de Vida" subtitulo="Candidatos disponibles, incluidas las autopostulaciones públicas" />

      <Card className="mb-4">
        <div className="flex gap-2">
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), buscar())}
            placeholder="Buscar por nombre, documento, teléfono, correo, formación o cargo de interés…"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <Boton onClick={buscar} disabled={buscando}><Search size={15} className="mr-1 inline" />{buscando ? 'Buscando…' : 'Buscar'}</Boton>
        </div>
      </Card>

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
    </div>
  )
}
