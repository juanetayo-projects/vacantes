import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const CAMPO = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'

export default function PostulacionPerfilSociodemografico() {
  const { token } = useParams()
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState<{ candidato: string; cargo: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [form, setForm] = useState({
    estado_civil: '', nivel_educativo: '', personas_a_cargo: '', estrato: '', tipo_vivienda: '',
    eps: '', arl: '', fondo_pension: '', contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
  })

  useEffect(() => {
    setCargando(true); setError(''); setInfo(null)
    supabase.functions.invoke('portal-candidato', { body: { accion: 'validar_token', token } })
      .then(({ data, error }) => {
        if (error || data?.error) setError(data?.error ?? 'Este enlace no es válido.')
        else setInfo(data)
        setCargando(false)
      })
  }, [token])

  function set(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function enviar() {
    setEnviando(true); setError('')
    const { data, error } = await supabase.functions.invoke('portal-candidato', {
      body: {
        accion: 'enviar_perfil_sociodemografico', token,
        datos: {
          ...form,
          personas_a_cargo: form.personas_a_cargo ? Number(form.personas_a_cargo) : null,
          estrato: form.estrato ? Number(form.estrato) : null,
        },
      },
    })
    setEnviando(false)
    if (error || data?.error) setError(data?.error ?? 'No se pudo enviar el formulario.')
    else setEnviado(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand to-brand-dark2 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col items-center gap-2 bg-gradient-to-r from-brand to-brand-light px-6 py-5 text-center text-white">
          <img src={`${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`} alt="Clínica Santa Bárbara" className="h-10" />
          <p className="text-lg font-semibold">Santa Bárbara</p>
          <p className="text-xs text-white/80">Procesos de Selección · Talento Humano</p>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-6">
          {cargando && <p className="text-center text-sm text-slate-500">Cargando…</p>}
          {!cargando && error && !info && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
          {!cargando && info && !enviado && (
            <div className="flex flex-col gap-3">
              <div>
                <h1 className="text-lg font-semibold text-slate-800">Perfil Sociodemográfico</h1>
                <p className="text-sm text-slate-500">Hola {info.candidato}, completa esta información para el cargo de <strong>{info.cargo}</strong>.</p>
              </div>
              <select className={CAMPO} value={form.estado_civil} onChange={(e) => set('estado_civil', e.target.value)}>
                <option value="">Estado civil…</option>
                <option>Soltero(a)</option><option>Casado(a)</option><option>Unión libre</option>
                <option>Divorciado(a)</option><option>Viudo(a)</option>
              </select>
              <select className={CAMPO} value={form.nivel_educativo} onChange={(e) => set('nivel_educativo', e.target.value)}>
                <option value="">Nivel educativo…</option>
                <option>Bachiller</option><option>Técnico</option><option>Tecnólogo</option>
                <option>Profesional</option><option>Especialización</option><option>Maestría</option>
              </select>
              <input className={CAMPO} type="number" min={0} placeholder="Personas a cargo" value={form.personas_a_cargo} onChange={(e) => set('personas_a_cargo', e.target.value)} />
              <select className={CAMPO} value={form.estrato} onChange={(e) => set('estrato', e.target.value)}>
                <option value="">Estrato…</option>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <select className={CAMPO} value={form.tipo_vivienda} onChange={(e) => set('tipo_vivienda', e.target.value)}>
                <option value="">Tipo de vivienda…</option>
                <option>Propia</option><option>Arrendada</option><option>Familiar</option>
              </select>
              <input className={CAMPO} placeholder="EPS" value={form.eps} onChange={(e) => set('eps', e.target.value)} />
              <input className={CAMPO} placeholder="ARL (si aplica)" value={form.arl} onChange={(e) => set('arl', e.target.value)} />
              <input className={CAMPO} placeholder="Fondo de pensión" value={form.fondo_pension} onChange={(e) => set('fondo_pension', e.target.value)} />
              <input className={CAMPO} placeholder="Contacto de emergencia · Nombre" value={form.contacto_emergencia_nombre} onChange={(e) => set('contacto_emergencia_nombre', e.target.value)} />
              <input className={CAMPO} placeholder="Contacto de emergencia · Teléfono" value={form.contacto_emergencia_telefono} onChange={(e) => set('contacto_emergencia_telefono', e.target.value)} />
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button disabled={enviando} onClick={enviar}
                className="rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-60">
                {enviando ? 'Enviando…' : 'Enviar formulario'}
              </button>
            </div>
          )}
          {enviado && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={40} className="text-emerald-500" />
              <p className="text-sm text-slate-600">Recibimos tu información. Nuestro equipo de Talento Humano se pondrá en contacto para los últimos pasos de tu vinculación.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
