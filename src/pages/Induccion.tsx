import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Card, Stepper, Boton, Select, Input, Textarea, Badge } from '../components/ui'
import type { Tables } from '../lib/database.types'

const PASOS = ['Pre-Inducción', 'Inducción General', 'Inducción Específica', 'Evaluación']

const CHECKLIST_PRE = [
  { key: 'documentos_completos', label: 'Documentos Completos' },
  { key: 'examenes_medicos', label: 'Exámenes Médicos' },
  { key: 'entrega_dotacion', label: 'Entrega de Dotación' },
  { key: 'creacion_usuarios', label: 'Creación de Usuarios' },
  { key: 'asignacion_mentor', label: 'Asignación de Mentor' },
]
type EstadoItem = 'pendiente' | 'recibido' | 'completado'

type Postulacion = Tables<'postulaciones'> & { candidatos: Tables<'candidatos'>; vacantes: Tables<'vacantes'> }

export default function Induccion() {
  const { id } = useParams()
  const idNum = Number(id)
  const { perfil } = useAuth()
  const [paso, setPaso] = useState(0)
  const [postulacion, setPostulacion] = useState<Postulacion | null>(null)
  const [induccion, setInduccion] = useState<Tables<'inducciones'> | null>(null)
  const [documentos, setDocumentos] = useState<Tables<'documentos_contratacion'>[]>([])
  const [checklist, setChecklist] = useState<Record<string, EstadoItem>>({})
  const [mentores, setMentores] = useState<Tables<'profiles'>[]>([])
  const [mentorId, setMentorId] = useState('')
  const [agenda, setAgenda] = useState('')
  const [actividadesEspecificas, setActividadesEspecificas] = useState('')
  const [seguimientos, setSeguimientos] = useState<Tables<'seguimientos'>[]>([])

  async function cargar() {
    const { data: p } = await supabase.from('postulaciones').select('*, candidatos(*), vacantes(*)').eq('id', idNum).single()
    setPostulacion(p as any)
    let { data: ind } = await supabase.from('inducciones').select('*').eq('postulacion_id', idNum).maybeSingle()
    if (!ind) {
      await supabase.from('inducciones').upsert({ postulacion_id: idNum }, { onConflict: 'postulacion_id', ignoreDuplicates: true })
      const { data: existente } = await supabase.from('inducciones').select('*').eq('postulacion_id', idNum).single()
      ind = existente
    }
    setInduccion(ind)
    setChecklist((ind?.checklist as any) ?? {})
    setMentorId(ind?.mentor_id ?? '')
    const { data: docs } = await supabase.from('documentos_contratacion').select('*').eq('postulacion_id', idNum)
    setDocumentos(docs ?? [])
    const { data: recl } = await supabase.from('profiles').select('*').in('role', ['reclutador', 'admin', 'aprobador', 'direccion'])
    setMentores(recl ?? [])
    const { data: seg } = await supabase.from('seguimientos').select('*').eq('induccion_id', ind?.id ?? 0).order('dias')
    setSeguimientos(seg ?? [])
  }

  useEffect(() => { cargar() }, [id])

  async function marcarChecklist(key: string, estado: EstadoItem) {
    const nuevo = { ...checklist, [key]: estado }
    setChecklist(nuevo)
    if (induccion) await supabase.from('inducciones').update({ checklist: nuevo }).eq('id', induccion.id)
  }

  async function guardarGeneral() {
    if (!induccion) return
    await supabase.from('inducciones').update({ mentor_id: mentorId || null, etapa: 'induccion_general' }).eq('id', induccion.id)
    setPaso(2)
  }

  async function guardarEspecifica() {
    if (!induccion) return
    await supabase.from('inducciones').update({ etapa: 'induccion_especifica' }).eq('id', induccion.id)
    setPaso(3)
  }

  async function registrarSeguimiento(dias: 30 | 60 | 90, puntaje: string, resultado: string) {
    if (!induccion || !perfil) return
    await supabase.from('seguimientos').upsert({
      induccion_id: induccion.id, dias, evaluador_id: perfil.id,
      fecha_evaluacion: new Date().toISOString().slice(0, 10),
      puntaje_desempeno: puntaje ? Number(puntaje) : null, resultado,
    }, { onConflict: 'induccion_id,dias' })
    const { data: seg } = await supabase.from('seguimientos').select('*').eq('induccion_id', induccion.id).order('dias')
    setSeguimientos(seg ?? [])
  }

  async function completarInduccion() {
    if (!induccion) return
    await supabase.from('inducciones').update({ etapa: 'evaluacion', estado: 'completada' }).eq('id', induccion.id)
    cargar()
  }

  if (!postulacion) return <div className="text-slate-500">Cargando…</div>

  return (
    <div>
      <PageHeader titulo={`Inducción · ${postulacion.candidatos.nombre}`} subtitulo={`${postulacion.vacantes.cargo} · Ingreso ${induccion?.fecha_ingreso ?? '-'}`} />
      <Card className="mx-auto max-w-3xl">
        <Stepper pasos={PASOS} actual={paso} />

        {paso === 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-600">Checklist Pre-Inducción</h3>
              <div className="flex flex-col gap-2">
                {CHECKLIST_PRE.map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 text-sm">
                    <span>{item.label}</span>
                    <select value={checklist[item.key] ?? 'pendiente'}
                      onChange={(e) => marcarChecklist(item.key, e.target.value as EstadoItem)}
                      className="rounded border border-slate-300 px-1.5 py-1 text-xs">
                      <option value="pendiente">Pendiente</option>
                      <option value="recibido">Recibido</option>
                      <option value="completado">Completado</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-600">Documentos Requeridos</h3>
              <div className="flex flex-col gap-2">
                {documentos.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 text-sm">
                    <span className="capitalize">{d.tipo.replace('_', ' ')}</span>
                    <Badge texto={d.estado} valor={d.estado} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {paso === 1 && (
          <div className="flex flex-col gap-4">
            <Select label="Mentor Asignado" value={mentorId} onChange={(e) => setMentorId(e.target.value)}>
              <option value="">Sin asignar</option>
              {mentores.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </Select>
            <Textarea label="Agenda de Integración" rows={4} value={agenda} onChange={(e) => setAgenda(e.target.value)}
              placeholder="Reunión de bienvenida, presentación al equipo, recorrido por instalaciones…" />
          </div>
        )}

        {paso === 2 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-slate-600">Actividades de Inducción Específica por Cargo</h3>
            <Textarea rows={5} value={actividadesEspecificas} onChange={(e) => setActividadesEspecificas(e.target.value)}
              placeholder="Capacitaciones técnicas del área, protocolos específicos, entrenamiento en sistemas…" />
          </div>
        )}

        {paso === 3 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-slate-600">Evaluación de Periodo de Prueba</h3>
            {[30, 60, 90].map((dias) => {
              const existente = seguimientos.find((s) => s.dias === dias)
              return (
                <div key={dias} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-sm font-medium text-slate-700">Seguimiento a los {dias} días</p>
                  <div className="flex gap-2">
                    <Input placeholder="Puntaje /5.0" type="number" step={0.1} min={0} max={5}
                      defaultValue={existente?.puntaje_desempeno ?? ''}
                      onBlur={(e) => registrarSeguimiento(dias as 30 | 60 | 90, e.target.value, existente?.resultado ?? '')}
                      className="w-32" />
                    <Input placeholder="Resultado / observación" defaultValue={existente?.resultado ?? ''}
                      onBlur={(e) => registrarSeguimiento(dias as 30 | 60 | 90, String(existente?.puntaje_desempeno ?? ''), e.target.value)}
                      className="flex-1" />
                  </div>
                </div>
              )
            })}
            <Boton variante="exito" onClick={completarInduccion}>Marcar Inducción Completa</Boton>
          </div>
        )}

        {paso < 3 && (
          <div className="mt-6 flex justify-between">
            <Boton variante="secundario" disabled={paso === 0} onClick={() => setPaso((p) => p - 1)}>Anterior</Boton>
            {paso === 0 && <Boton onClick={() => setPaso(1)}>Siguiente</Boton>}
            {paso === 1 && <Boton onClick={guardarGeneral}>Siguiente</Boton>}
            {paso === 2 && <Boton onClick={guardarEspecifica}>Siguiente</Boton>}
          </div>
        )}
      </Card>
    </div>
  )
}
