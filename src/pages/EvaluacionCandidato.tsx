import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Card, Badge, Boton, Modal, Select, Input, Textarea, TableHead, TableEmpty, filaZebra } from '../components/ui'
import { useAlert } from '../lib/alerts'
import { ESTADO_POSTULACION_LABELS, formatoFecha } from '../lib/data'
import type { Tables } from '../lib/database.types'

type Postulacion = Tables<'postulaciones'> & { candidatos: Tables<'candidatos'>; vacantes: Tables<'vacantes'> }
type Evaluacion = Tables<'evaluacion_competencias'> & { competencias: Tables<'competencias'> }
type Entrevista = Tables<'entrevistas'> & { profiles: { nombre: string } | null }

const TIPO_ENTREVISTA_LABELS: Record<string, string> = {
  inicial: 'Entrevista Inicial', tecnica: 'Prueba Técnica',
  area_solicitante: 'Entrevista con Área', final_gerencia: 'Entrevista Final Gerencia',
}

export default function EvaluacionCandidato() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const { confirm, notify } = useAlert()
  const [tab, setTab] = useState<'resumen' | 'evaluaciones' | 'entrevistas' | 'documentos'>('resumen')
  const [postulacion, setPostulacion] = useState<Postulacion | null>(null)
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([])
  const [modalEntrevista, setModalEntrevista] = useState(false)
  const [tipoEnt, setTipoEnt] = useState<Tables<'entrevistas'>['tipo']>('inicial')
  const [fechaEnt, setFechaEnt] = useState('')
  const [resultadoEnt, setResultadoEnt] = useState('')
  const [comentariosEnt, setComentariosEnt] = useState('')

  async function cargar() {
    const { data: p } = await supabase.from('postulaciones').select('*, candidatos(*), vacantes(*)').eq('id', Number(id)).single()
    setPostulacion(p as any)
    if (p) {
      const { data: vc } = await supabase.from('vacante_competencias').select('*, competencias(*)').eq('vacante_id', p.vacante_id)
      const { data: ev } = await supabase.from('evaluacion_competencias').select('*, competencias(*)').eq('postulacion_id', p.id)
      const existentes = new Set((ev ?? []).map((e) => e.competencia_id))
      const faltantes = (vc ?? []).filter((c) => !existentes.has(c.competencia_id))
      if (faltantes.length) {
        await supabase.from('evaluacion_competencias').upsert(
          faltantes.map((c) => ({ postulacion_id: p.id, competencia_id: c.competencia_id, peso: c.peso })),
          { onConflict: 'postulacion_id,competencia_id', ignoreDuplicates: true }
        )
        const { data: ev2 } = await supabase.from('evaluacion_competencias').select('*, competencias(*)').eq('postulacion_id', p.id)
        setEvaluaciones((ev2 as any) ?? [])
      } else {
        setEvaluaciones((ev as any) ?? [])
      }
      const { data: ents } = await supabase.from('entrevistas').select('*, profiles(nombre)').eq('postulacion_id', p.id).order('fecha')
      setEntrevistas((ents as any) ?? [])
    }
  }

  useEffect(() => { cargar() }, [id])

  async function actualizarCampo(evId: number, campo: 'autoevaluacion' | 'evaluador1' | 'evaluador2', valor: string) {
    const num = valor === '' ? null : Number(valor)
    setEvaluaciones((prev) => prev.map((e) => e.id === evId ? { ...e, [campo]: num } : e))
    if (campo === 'autoevaluacion') await supabase.from('evaluacion_competencias').update({ autoevaluacion: num }).eq('id', evId)
    else if (campo === 'evaluador1') await supabase.from('evaluacion_competencias').update({ evaluador1: num }).eq('id', evId)
    else await supabase.from('evaluacion_competencias').update({ evaluador2: num }).eq('id', evId)
    cargar()
  }

  const puntajeFinal = useMemo(() => {
    const pesoTotal = evaluaciones.reduce((a, e) => a + Number(e.peso), 0)
    if (!pesoTotal) return null
    const suma = evaluaciones.reduce((a, e) => a + (Number(e.promedio ?? 0) * Number(e.peso)), 0)
    return Math.round((suma / pesoTotal) * 20) / 20
  }, [evaluaciones])

  async function cambiarEstado(estado: Postulacion['estado']) {
    if (!postulacion) return
    const ok = await confirm(
      estado === 'seleccionado'
        ? `¿Confirmas que ${postulacion.candidatos.nombre} es el candidato seleccionado para ${postulacion.vacantes.cargo}?`
        : `¿Confirmas que descartas a ${postulacion.candidatos.nombre} del proceso?`,
      { titulo: 'Confirmar decisión', variante: estado === 'seleccionado' ? 'primario' : 'peligro', textoConfirmar: estado === 'seleccionado' ? 'Seleccionar' : 'No seleccionar' }
    )
    if (!ok) return
    const esDescarte = estado !== 'seleccionado'
    await supabase.from('postulaciones').update({
      estado: esDescarte ? 'descartado' : estado,
      motivo_descarte: esDescarte ? 'no_cumple_entrevista' : null,
      updated_at: new Date().toISOString(),
    }).eq('id', postulacion.id)
    if (estado === 'seleccionado') navigate(`/postulaciones/${postulacion.id}/contratacion`)
    else { notify('El candidato fue descartado del proceso.', 'info'); cargar() }
  }

  async function agregarEntrevista() {
    if (!postulacion || !perfil) return
    await supabase.from('entrevistas').insert({
      postulacion_id: postulacion.id, tipo: tipoEnt, fecha: fechaEnt || null,
      entrevistador_id: perfil.id, resultado: resultadoEnt, comentarios: comentariosEnt,
    })
    setModalEntrevista(false); setFechaEnt(''); setResultadoEnt(''); setComentariosEnt('')
    cargar()
  }

  if (!postulacion) return <div className="text-slate-500">Cargando…</div>
  const c = postulacion.candidatos

  return (
    <div>
      <PageHeader titulo={c.nombre} subtitulo={`${postulacion.vacantes.cargo} · ${postulacion.vacantes.codigo}`}
        acciones={<Badge texto={ESTADO_POSTULACION_LABELS[postulacion.estado]} valor={postulacion.estado} />} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-lg font-semibold text-white">
              {c.nombre.slice(0, 2).toUpperCase()}
            </div>
            <p className="mt-2 font-semibold text-slate-700">{c.nombre}</p>
            <p className="text-xs text-slate-400">{c.email}</p>
          </div>
          <dl className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-400">Teléfono</dt><dd>{c.telefono ?? '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Experiencia</dt><dd>{c.experiencia_anios ?? '-'} años</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Formación</dt><dd>{c.formacion ?? '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Fuente</dt><dd className="capitalize">{c.fuente?.replace('_', ' ')}</dd></div>
          </dl>
          {puntajeFinal != null && (
            <div className="mt-4 rounded-xl bg-gradient-to-br from-brand to-brand-light p-4 text-center text-white">
              <p className="text-xs opacity-80">Puntaje Final</p>
              <p className="text-2xl font-bold">{puntajeFinal.toFixed(1)} / 5.0</p>
            </div>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <Boton variante="exito" onClick={() => cambiarEstado('seleccionado')}>Seleccionar Candidato</Boton>
            <Boton variante="peligro" onClick={() => cambiarEstado('no_seleccionado')}>No Seleccionar</Boton>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-4 flex gap-2 border-b border-slate-200 text-sm">
            {(['resumen', 'evaluaciones', 'entrevistas', 'documentos'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-2 font-medium capitalize ${tab === t ? 'border-b-2 border-brand text-brand' : 'text-slate-500'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'resumen' && (
            <div className="text-sm text-slate-600">
              <p>Postulado el {formatoFecha(postulacion.fecha_postulacion)}.</p>
              {postulacion.notas && <p className="mt-2 rounded bg-slate-50 p-3">{postulacion.notas}</p>}
              {c.hoja_vida_url && <a href={c.hoja_vida_url} target="_blank" className="mt-2 inline-block text-brand-light hover:underline">Ver hoja de vida</a>}
            </div>
          )}

          {tab === 'evaluaciones' && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <TableHead>
                  <th>Competencia</th><th>Peso</th>
                  <th>Autoevaluación</th><th>Evaluador 1</th>
                  <th>Evaluador 2</th><th>Promedio</th>
                </TableHead>
                <tbody>
                  {evaluaciones.map((e, i) => (
                    <tr key={e.id} className={filaZebra(i)}>
                      <td className="px-4 py-2">{e.competencias.nombre}</td>
                      <td className="px-4 py-2 text-slate-500">{e.peso}%</td>
                      {(['autoevaluacion', 'evaluador1', 'evaluador2'] as const).map((campo) => (
                        <td key={campo} className="px-4 py-2">
                          <input type="number" min={0} max={5} step={0.1} defaultValue={e[campo] ?? ''}
                            onBlur={(ev) => actualizarCampo(e.id, campo, ev.target.value)}
                            className="w-16 rounded border border-slate-300 px-1.5 py-1 text-xs" />
                        </td>
                      ))}
                      <td className="px-4 py-2 font-semibold text-brand">{e.promedio ?? '-'}</td>
                    </tr>
                  ))}
                  {!evaluaciones.length && <TableEmpty colSpan={6}>Esta vacante no tiene competencias configuradas</TableEmpty>}
                </tbody>
                {puntajeFinal != null && (
                  <tfoot>
                    <tr><td colSpan={5} className="px-4 pt-3 text-right font-medium text-slate-600">Puntaje Final</td>
                      <td className="px-4 pt-3 text-lg font-bold text-brand">{puntajeFinal.toFixed(1)} / 5.0</td></tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {tab === 'entrevistas' && (
            <div>
              <div className="mb-3 flex justify-end">
                <Boton className="!px-3 !py-1.5 text-xs" onClick={() => setModalEntrevista(true)}>+ Registrar Entrevista</Boton>
              </div>
              <div className="flex flex-col gap-2">
                {entrevistas.map((e) => (
                  <div key={e.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-700">{TIPO_ENTREVISTA_LABELS[e.tipo]}</span>
                      <span className="text-xs text-slate-400">{formatoFecha(e.fecha)}</span>
                    </div>
                    <p className="text-xs text-slate-500">Entrevistador: {e.profiles?.nombre ?? '-'} · Resultado: {e.resultado ?? '-'}</p>
                    {e.comentarios && <p className="mt-1 text-xs text-slate-600">{e.comentarios}</p>}
                  </div>
                ))}
                {!entrevistas.length && <p className="py-6 text-center text-sm text-slate-400">Sin entrevistas registradas</p>}
              </div>
            </div>
          )}

          {tab === 'documentos' && (
            <p className="py-6 text-center text-sm text-slate-400">Los documentos de contratación se gestionan en la etapa de Contratación.</p>
          )}
        </Card>
      </div>

      <Modal open={modalEntrevista} onClose={() => setModalEntrevista(false)} titulo="Registrar Entrevista">
        <div className="flex flex-col gap-3">
          <Select label="Tipo" value={tipoEnt} onChange={(e) => setTipoEnt(e.target.value as any)}>
            {Object.entries(TIPO_ENTREVISTA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <Input label="Fecha" type="datetime-local" value={fechaEnt} onChange={(e) => setFechaEnt(e.target.value)} />
          <Input label="Resultado" value={resultadoEnt} onChange={(e) => setResultadoEnt(e.target.value)} placeholder="Continuar / Descartar / Recomendar…" />
          <Textarea label="Comentarios" rows={3} value={comentariosEnt} onChange={(e) => setComentariosEnt(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModalEntrevista(false)}>Cancelar</Boton>
            <Boton onClick={agregarEntrevista}>Guardar</Boton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
