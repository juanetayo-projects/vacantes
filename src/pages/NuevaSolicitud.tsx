import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Card, Stepper, Boton, Input, Select, Textarea, Badge } from '../components/ui'
import { TIPO_VACANTE_LABELS, URGENCIA_LABELS, NIVELES_APROBACION, formatoMoneda } from '../lib/data'
import type { Tables } from '../lib/database.types'

const PASOS = ['Datos Generales', 'Justificación', 'Perfil del Cargo', 'Presupuesto', 'Revisión']

type Requisito = { descripcion: string; tipo: 'obligatorio' | 'deseable' }

export default function NuevaSolicitud() {
  const { id } = useParams()
  const editando = !!id
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [paso, setPaso] = useState(0)
  const [areas, setAreas] = useState<Tables<'areas'>[]>([])
  const [competencias, setCompetencias] = useState<Tables<'competencias'>[]>([])
  const [enviando, setEnviando] = useState(false)

  // Datos generales
  const [areaId, setAreaId] = useState('')
  const [cargo, setCargo] = useState('')
  const [tipoVacante, setTipoVacante] = useState<'creacion' | 'reemplazo' | 'expansion'>('reemplazo')
  const [numeroVacantes, setNumeroVacantes] = useState(1)
  const [nivelUrgencia, setNivelUrgencia] = useState<'bajo' | 'medio' | 'alto' | 'critico'>('medio')
  const [fechaCobertura, setFechaCobertura] = useState('')

  // Justificación
  const [justificacion, setJustificacion] = useState('')

  // Perfil del cargo
  const [descripcionCargo, setDescripcionCargo] = useState('')
  const [competenciasSel, setCompetenciasSel] = useState<Record<number, number>>({})
  const [requisitos, setRequisitos] = useState<Requisito[]>([])
  const [nuevoRequisito, setNuevoRequisito] = useState('')
  const [tipoRequisito, setTipoRequisito] = useState<'obligatorio' | 'deseable'>('obligatorio')

  // Presupuesto
  const [presupuesto, setPresupuesto] = useState('')
  const [salarioMin, setSalarioMin] = useState('')
  const [salarioMax, setSalarioMax] = useState('')

  useEffect(() => {
    supabase.from('areas').select('*').order('nombre').then(({ data }) => setAreas(data ?? []))
    supabase.from('competencias').select('*').order('nombre').then(({ data }) => setCompetencias(data ?? []))
  }, [])

  useEffect(() => {
    if (!id) return
    const idNum = Number(id)
    supabase.from('vacantes').select('*').eq('id', idNum).single().then(({ data: v }) => {
      if (!v) return
      setAreaId(String(v.area_id)); setCargo(v.cargo); setTipoVacante(v.tipo_vacante)
      setNumeroVacantes(v.numero_vacantes); setNivelUrgencia(v.nivel_urgencia)
      setFechaCobertura(v.fecha_estimada_cobertura ?? ''); setJustificacion(v.justificacion ?? '')
      setDescripcionCargo(v.descripcion_cargo ?? '')
      setPresupuesto(String(v.presupuesto ?? '')); setSalarioMin(String(v.rango_salarial_min ?? '')); setSalarioMax(String(v.rango_salarial_max ?? ''))
      setPaso(2)
    })
    supabase.from('vacante_competencias').select('*').eq('vacante_id', idNum).then(({ data }) => {
      const m: Record<number, number> = {}
      for (const c of data ?? []) m[c.competencia_id] = c.peso
      setCompetenciasSel(m)
    })
    supabase.from('vacante_requisitos').select('*').eq('vacante_id', idNum).then(({ data }) => {
      setRequisitos((data ?? []).map((r) => ({ descripcion: r.descripcion, tipo: r.tipo as 'obligatorio' | 'deseable' })))
    })
  }, [id])

  function toggleCompetencia(cid: number, pesoDefecto: number) {
    setCompetenciasSel((prev) => {
      const copia = { ...prev }
      if (cid in copia) delete copia[cid]
      else copia[cid] = pesoDefecto || 10
      return copia
    })
  }

  function agregarRequisito() {
    if (!nuevoRequisito.trim()) return
    setRequisitos((r) => [...r, { descripcion: nuevoRequisito.trim(), tipo: tipoRequisito }])
    setNuevoRequisito('')
  }

  async function enviarSolicitud() {
    if (!perfil) return
    setEnviando(true)
    try {
      let vacanteId = id ? Number(id) : null
      const payload = {
        area_id: Number(areaId),
        cargo,
        tipo_vacante: tipoVacante,
        numero_vacantes: numeroVacantes,
        nivel_urgencia: nivelUrgencia,
        fecha_estimada_cobertura: fechaCobertura || null,
        justificacion,
        descripcion_cargo: descripcionCargo,
        presupuesto: presupuesto ? Number(presupuesto) : null,
        rango_salarial_min: salarioMin ? Number(salarioMin) : null,
        rango_salarial_max: salarioMax ? Number(salarioMax) : null,
      }

      if (vacanteId) {
        await supabase.from('vacantes').update(payload).eq('id', vacanteId)
      } else {
        const { data, error } = await supabase.from('vacantes').insert({
          ...payload,
          solicitante_id: perfil.id,
          estado: 'pendiente_aprobacion',
        }).select('id').single()
        if (error) throw error
        vacanteId = data.id

        await supabase.from('aprobaciones').insert(
          NIVELES_APROBACION.map((n) => ({
            vacante_id: vacanteId!,
            nivel: n.nivel,
            nombre_nivel: n.nombre,
            orden: n.nivel,
            estado: 'pendiente' as const,
          }))
        )
      }

      await supabase.from('vacante_competencias').delete().eq('vacante_id', vacanteId)
      const filasCompetencias = Object.entries(competenciasSel).map(([cid, peso]) => ({
        vacante_id: vacanteId!, competencia_id: Number(cid), peso,
      }))
      if (filasCompetencias.length) await supabase.from('vacante_competencias').insert(filasCompetencias)

      await supabase.from('vacante_requisitos').delete().eq('vacante_id', vacanteId)
      if (requisitos.length) {
        await supabase.from('vacante_requisitos').insert(
          requisitos.map((r) => ({ vacante_id: vacanteId!, descripcion: r.descripcion, tipo: r.tipo }))
        )
      }

      navigate(`/vacantes/${vacanteId}/aprobacion`)
    } finally {
      setEnviando(false)
    }
  }

  const puedeAvanzar = () => {
    if (paso === 0) return areaId && cargo && fechaCobertura
    if (paso === 1) return justificacion.trim().length > 0
    return true
  }

  return (
    <div>
      <PageHeader titulo={editando ? 'Editar Perfil del Cargo' : 'Nueva Solicitud de Vacante'} />
      <Card className="mx-auto max-w-3xl">
        <Stepper pasos={PASOS} actual={paso} />

        {paso === 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <h3 className="col-span-full text-sm font-semibold text-slate-600">Datos del Área Solicitante</h3>
            <Select label="Área" value={areaId} onChange={(e) => setAreaId(e.target.value)} required>
              <option value="">Seleccionar…</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre} ({a.codigo})</option>)}
            </Select>
            <Input label="Responsable" value={perfil?.nombre ?? ''} disabled />
            <h3 className="col-span-full mt-2 text-sm font-semibold text-slate-600">Información de la Vacante</h3>
            <Input label="Cargo solicitado" value={cargo} onChange={(e) => setCargo(e.target.value)} required />
            <Select label="Tipo de vacante" value={tipoVacante} onChange={(e) => setTipoVacante(e.target.value as any)}>
              {Object.entries(TIPO_VACANTE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Input label="Número de vacantes" type="number" min={1} value={numeroVacantes}
              onChange={(e) => setNumeroVacantes(Number(e.target.value))} />
            <Select label="Nivel de urgencia" value={nivelUrgencia} onChange={(e) => setNivelUrgencia(e.target.value as any)}>
              {Object.entries(URGENCIA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Input label="Fecha estimada de cobertura" type="date" value={fechaCobertura}
              onChange={(e) => setFechaCobertura(e.target.value)} required />
          </div>
        )}

        {paso === 1 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-slate-600">Justificación de la Vacante</h3>
            <Textarea rows={8} value={justificacion} onChange={(e) => setJustificacion(e.target.value)}
              placeholder="Explique la necesidad, impacto en el servicio, carga laboral, organigrama, etc." />
          </div>
        )}

        {paso === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-600">Descripción del Cargo</h3>
              <Textarea rows={5} value={descripcionCargo} onChange={(e) => setDescripcionCargo(e.target.value)}
                placeholder="Perfil profesional, experiencia mínima requerida, funciones principales…" />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-600">Competencias Requeridas</h3>
              <div className="flex flex-wrap gap-2">
                {competencias.map((c) => {
                  const activo = c.id in competenciasSel
                  return (
                    <button key={c.id} type="button" onClick={() => toggleCompetencia(c.id, c.peso_defecto ?? 10)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        activo ? 'border-brand bg-brand text-white' : 'border-slate-300 text-slate-600 hover:border-brand-light'
                      }`}>
                      {c.nombre}{activo && ` · ${competenciasSel[c.id]}%`}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-600">Requisitos</h3>
                <div className="mb-2 flex gap-2">
                  <select value={tipoRequisito} onChange={(e) => setTipoRequisito(e.target.value as any)}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
                    <option value="obligatorio">Obligatorio</option>
                    <option value="deseable">Deseable</option>
                  </select>
                  <input value={nuevoRequisito} onChange={(e) => setNuevoRequisito(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarRequisito())}
                    placeholder="Ej: Registro médico vigente"
                    className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
                  <Boton type="button" onClick={agregarRequisito} className="!px-3 !py-1.5 text-xs">Agregar</Boton>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(['obligatorio', 'deseable'] as const).map((tipo) => (
                    <div key={tipo}>
                      <p className="mb-1 text-xs font-semibold uppercase text-slate-400">
                        Requisitos {tipo === 'obligatorio' ? 'Obligatorios' : 'Deseables'}
                      </p>
                      <ul className="flex flex-col gap-1">
                        {requisitos.filter((r) => r.tipo === tipo).map((r, i) => (
                          <li key={i} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-xs">
                            {r.descripcion}
                            <button type="button" onClick={() => setRequisitos((rs) => rs.filter((x) => x !== r))}>
                              <X size={12} className="text-slate-400 hover:text-red-500" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Presupuesto asignado" type="number" value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} />
            <Input label="Rango salarial mínimo" type="number" value={salarioMin} onChange={(e) => setSalarioMin(e.target.value)} />
            <Input label="Rango salarial máximo" type="number" value={salarioMax} onChange={(e) => setSalarioMax(e.target.value)} />
          </div>
        )}

        {paso === 4 && (
          <div className="flex flex-col gap-3 text-sm">
            <h3 className="text-sm font-semibold text-slate-600">Resumen de la Solicitud</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <dt className="text-slate-400">Cargo</dt><dd>{cargo}</dd>
              <dt className="text-slate-400">Área</dt><dd>{areas.find((a) => String(a.id) === areaId)?.nombre}</dd>
              <dt className="text-slate-400">Tipo</dt><dd>{TIPO_VACANTE_LABELS[tipoVacante]}</dd>
              <dt className="text-slate-400">Urgencia</dt><dd><Badge texto={URGENCIA_LABELS[nivelUrgencia]} valor={nivelUrgencia} /></dd>
              <dt className="text-slate-400">Fecha estimada</dt><dd>{fechaCobertura}</dd>
              <dt className="text-slate-400">Presupuesto</dt><dd>{formatoMoneda(presupuesto ? Number(presupuesto) : null)}</dd>
            </dl>
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
              Al enviar, la solicitud iniciará el flujo de aprobación jerárquica (Jefe Directo → Gerencia → Dirección de Talento Humano → Dirección General).
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Boton variante="secundario" disabled={paso === 0} onClick={() => setPaso((p) => p - 1)}>Anterior</Boton>
          {paso < PASOS.length - 1 ? (
            <Boton disabled={!puedeAvanzar()} onClick={() => setPaso((p) => p + 1)}>Siguiente</Boton>
          ) : (
            <Boton disabled={enviando} onClick={enviarSolicitud}>{enviando ? 'Enviando…' : editando ? 'Guardar Cambios' : 'Enviar Solicitud'}</Boton>
          )}
        </div>
      </Card>
    </div>
  )
}
