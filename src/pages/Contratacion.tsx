import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Card, Stepper, Boton, Input, InputMoneda, Select, Textarea, Badge } from '../components/ui'
import { useAlert } from '../lib/alerts'
import { formatoMoneda } from '../lib/data'
import type { Tables } from '../lib/database.types'

const PASOS = ['Selección', 'Oferta', 'Documentación', 'Contrato', 'Inducción']
const DOCS = [
  { tipo: 'cedula', label: 'Cédula de Ciudadanía' },
  { tipo: 'diploma', label: 'Diploma Profesional' },
  { tipo: 'tarjeta_profesional', label: 'Tarjeta Profesional' },
  { tipo: 'certificado_rethus', label: 'Certificado Rethus' },
  { tipo: 'antecedentes', label: 'Antecedentes' },
]
const BENEFICIOS = [
  { key: 'seguro_salud', label: 'Seguro de Salud' },
  { key: 'seguro_vida', label: 'Seguro de Vida' },
  { key: 'auxilio_transporte', label: 'Auxilio de Transporte' },
  { key: 'plan_bienestar', label: 'Plan de Bienestar' },
]

type Postulacion = Tables<'postulaciones'> & { candidatos: Tables<'candidatos'>; vacantes: Tables<'vacantes'> }

export default function Contratacion() {
  const { id } = useParams()
  const idNum = Number(id)
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const { confirm } = useAlert()
  const [paso, setPaso] = useState(0)
  const [postulacion, setPostulacion] = useState<Postulacion | null>(null)
  const [oferta, setOferta] = useState<Tables<'ofertas'> | null>(null)
  const [documentos, setDocumentos] = useState<Tables<'documentos_contratacion'>[]>([])

  const [salario, setSalario] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [tipoContrato, setTipoContrato] = useState('Término indefinido')
  const [jornada, setJornada] = useState('Completa')
  const [beneficios, setBeneficios] = useState<Record<string, boolean>>({})
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    const { data: p } = await supabase.from('postulaciones').select('*, candidatos(*), vacantes(*)').eq('id', idNum).single()
    setPostulacion(p as any)
    const { data: of } = await supabase.from('ofertas').select('*').eq('postulacion_id', idNum).order('created_at', { ascending: false }).limit(1)
    if (of?.[0]) {
      const o = of[0]
      setOferta(o)
      setSalario(String(o.salario_ofrecido ?? '')); setFechaInicio(o.fecha_inicio ?? '')
      setTipoContrato(o.tipo_contrato ?? 'Término indefinido'); setJornada(o.jornada ?? 'Completa')
      setBeneficios((o.beneficios as any) ?? {}); setObservaciones(o.observaciones ?? '')
    }
    await supabase.from('documentos_contratacion')
      .upsert(DOCS.map((d) => ({ postulacion_id: idNum, tipo: d.tipo })), { onConflict: 'postulacion_id,tipo', ignoreDuplicates: true })
    const { data: docs } = await supabase.from('documentos_contratacion').select('*').eq('postulacion_id', idNum).order('id')
    setDocumentos(docs ?? [])
  }

  useEffect(() => { cargar() }, [id])

  async function guardarOferta() {
    setGuardando(true)
    const payload = {
      postulacion_id: Number(id), salario_ofrecido: salario ? Number(salario) : null,
      fecha_inicio: fechaInicio || null, tipo_contrato: tipoContrato, jornada, beneficios, observaciones,
    }
    if (oferta) await supabase.from('ofertas').update(payload).eq('id', oferta.id)
    else {
      const { data } = await supabase.from('ofertas').insert(payload).select().single()
      setOferta(data)
    }
    setGuardando(false)
    setPaso(2)
  }

  async function actualizarDocumento(docId: number, estado: Tables<'documentos_contratacion'>['estado']) {
    setDocumentos((prev) => prev.map((d) => d.id === docId ? { ...d, estado } : d))
    await supabase.from('documentos_contratacion').update({ estado }).eq('id', docId)
  }

  async function formalizarContratacion() {
    if (!postulacion || !perfil) return
    const ok = await confirm(
      `Vas a formalizar la contratación de ${postulacion.candidatos.nombre} para ${postulacion.vacantes.cargo}. La vacante quedará marcada como Contratada.`,
      { titulo: 'Formalizar contratación', textoConfirmar: 'Formalizar' }
    )
    if (!ok) return
    setGuardando(true)
    if (oferta) await supabase.from('ofertas').update({ estado: 'aceptada', aprobado_por: perfil.id, fecha_aprobacion: new Date().toISOString() }).eq('id', oferta.id)
    await supabase.from('vacantes').update({ estado: 'contratada', fecha_cierre: new Date().toISOString().slice(0, 10) }).eq('id', postulacion.vacante_id)
    await supabase.from('inducciones').upsert({ postulacion_id: postulacion.id, fecha_ingreso: fechaInicio || null }, { onConflict: 'postulacion_id' })
    setGuardando(false)
    setPaso(4)
  }

  if (!postulacion) return <div className="text-slate-500">Cargando…</div>

  return (
    <div>
      <PageHeader titulo={`Contratación · ${postulacion.candidatos.nombre}`} subtitulo={`${postulacion.vacantes.cargo} · ${postulacion.vacantes.codigo}`} />
      <Card className="mx-auto max-w-3xl">
        <Stepper pasos={PASOS} actual={paso} />

        {paso === 0 && (
          <div className="flex flex-col gap-3 text-sm">
            <p>Candidato seleccionado para la vacante <b>{postulacion.vacantes.cargo}</b>.</p>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="font-medium text-slate-700">{postulacion.candidatos.nombre}</p>
              <p className="text-xs text-slate-500">{postulacion.candidatos.email} · {postulacion.candidatos.telefono}</p>
            </div>
            <Boton className="w-fit" onClick={() => setPaso(1)}>Continuar con la Oferta</Boton>
          </div>
        )}

        {paso === 1 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-slate-600">Oferta Laboral</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputMoneda label="Salario Ofrecido" value={salario} onChange={setSalario} />
              <Input label="Fecha de Inicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
              <Select label="Tipo de Contrato" value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value)}>
                <option>Término indefinido</option><option>Término fijo</option><option>Obra o labor</option><option>Prestación de servicios</option>
              </Select>
              <Select label="Jornada" value={jornada} onChange={(e) => setJornada(e.target.value)}>
                <option>Completa</option><option>Medio tiempo</option><option>Por turnos</option>
              </Select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-600">Beneficios</p>
              <div className="grid grid-cols-2 gap-2">
                {BENEFICIOS.map((b) => (
                  <label key={b.key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!beneficios[b.key]}
                      onChange={(e) => setBeneficios((prev) => ({ ...prev, [b.key]: e.target.checked }))} />
                    {b.label}
                  </label>
                ))}
              </div>
            </div>
            <Textarea label="Observaciones" rows={3} value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Condicionado a exámenes médicos ocupacionales y verificación de referencias laborales." />
          </div>
        )}

        {paso === 2 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-600">Documentos Requeridos</h3>
            <div className="flex flex-col gap-2">
              {documentos.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                  <span>{DOCS.find((x) => x.tipo === d.tipo)?.label}</span>
                  <div className="flex gap-1">
                    {(['pendiente', 'recibido', 'completado'] as const).map((e) => (
                      <button key={e} onClick={() => actualizarDocumento(d.id, e)}
                        className={`rounded px-2 py-1 text-xs capitalize ${d.estado === e ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="flex flex-col gap-3 text-sm">
            <h3 className="text-sm font-semibold text-slate-600">Confirmación de Contrato</h3>
            <dl className="grid grid-cols-2 gap-y-2">
              <dt className="text-slate-400">Salario</dt><dd>{formatoMoneda(salario ? Number(salario) : null)}</dd>
              <dt className="text-slate-400">Tipo</dt><dd>{tipoContrato}</dd>
              <dt className="text-slate-400">Fecha de ingreso</dt><dd>{fechaInicio}</dd>
              <dt className="text-slate-400">Documentos completos</dt>
              <dd><Badge texto={`${documentos.filter((d) => d.estado === 'completado').length}/${documentos.length}`} valor="completado" /></dd>
            </dl>
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
              Al formalizar, la vacante se marcará como Contratada y se habilitará el proceso de inducción.
            </p>
          </div>
        )}

        {paso === 4 && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-lg font-semibold text-emerald-600">¡Contratación formalizada!</p>
            <p className="text-sm text-slate-500">Continúa con el plan de inducción de {postulacion.candidatos.nombre}.</p>
            <Boton onClick={() => navigate(`/postulaciones/${postulacion.id}/induccion`)}>Ir a Inducción</Boton>
          </div>
        )}

        {paso < 4 && (
          <div className="mt-6 flex justify-between">
            <Boton variante="secundario" disabled={paso === 0} onClick={() => setPaso((p) => p - 1)}>Anterior</Boton>
            {paso === 1 && <Boton disabled={guardando} onClick={guardarOferta}>{guardando ? 'Guardando…' : 'Guardar y Continuar'}</Boton>}
            {paso === 2 && <Boton onClick={() => setPaso(3)}>Siguiente</Boton>}
            {paso === 3 && <Boton disabled={guardando} onClick={formalizarContratacion}>{guardando ? 'Formalizando…' : 'Formalizar Contratación'}</Boton>}
          </div>
        )}
      </Card>
    </div>
  )
}
