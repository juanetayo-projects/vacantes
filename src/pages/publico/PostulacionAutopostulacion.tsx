import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const CAMPO = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

function leerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function PostulacionAutopostulacion() {
  const [cargando, setCargando] = useState(true)
  const [abierta, setAbierta] = useState(false)
  const [mensajeCerrado, setMensajeCerrado] = useState('')
  const [areas, setAreas] = useState<{ id: number; nombre: string }[]>([])
  const [errorCarga, setErrorCarga] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [cv, setCv] = useState<File | null>(null)
  const [honeypot, setHoneypot] = useState('')
  const turnstileRef = useRef<HTMLDivElement>(null)
  const [turnstileListo, setTurnstileListo] = useState(false)

  const [form, setForm] = useState({
    nombre: '', tipo_documento: 'CC', numero_documento: '', email: '', telefono: '',
    area_interes_id: '', cargo_interes: '', formacion: '', experiencia_anios: '', habilidades: '',
  })

  useEffect(() => {
    setCargando(true); setErrorCarga('')
    supabase.functions.invoke('portal-candidato', { body: { accion: 'estado_autopostulacion' } })
      .then(({ data, error }) => {
        if (error || data?.error) setErrorCarga(data?.error ?? 'No se pudo cargar el formulario.')
        else { setAbierta(!!data.abierta); setMensajeCerrado(data.mensaje ?? ''); setAreas(data.areas ?? []) }
        setCargando(false)
      })
  }, [])

  useEffect(() => {
    if (!abierta || !TURNSTILE_SITE_KEY) return
    if (!document.getElementById('turnstile-script')) {
      const script = document.createElement('script')
      script.id = 'turnstile-script'
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      script.onload = () => setTurnstileListo(true)
      document.head.appendChild(script)
    } else {
      setTurnstileListo(true)
    }
  }, [abierta])

  useEffect(() => {
    if (turnstileListo && turnstileRef.current && (window as any).turnstile) {
      turnstileRef.current.innerHTML = ''
      ;(window as any).turnstile.render(turnstileRef.current, { sitekey: TURNSTILE_SITE_KEY })
    }
  }, [turnstileListo])

  function set(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function enviar() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    const turnstileToken = (turnstileRef.current?.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value
    if (TURNSTILE_SITE_KEY && !turnstileToken) { setError('Confirma que no eres un robot.'); return }
    setEnviando(true); setError('')
    const { data, error } = await supabase.functions.invoke('portal-candidato', {
      body: {
        accion: 'autopostularse',
        honeypot,
        turnstileToken,
        datos: { ...form, area_interes_id: form.area_interes_id ? Number(form.area_interes_id) : null, experiencia_anios: form.experiencia_anios ? Number(form.experiencia_anios) : null },
        cvBase64: cv ? await leerComoBase64(cv) : null,
        cvNombreArchivo: cv?.name,
      },
    })
    setEnviando(false)
    if (error || data?.error) setError(data?.error ?? 'No se pudo enviar tu hoja de vida.')
    else setEnviado(true)
  }

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-b from-brand to-brand-dark2 sm:items-center sm:p-4">
      <div className="min-h-screen w-full bg-white sm:min-h-0 sm:max-w-md sm:overflow-hidden sm:rounded-2xl sm:shadow-2xl">
        <div className="flex flex-col items-center gap-2 bg-gradient-to-r from-brand to-brand-light px-6 py-5 text-center text-white">
          <img src={`${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`} alt="Clínica Santa Bárbara" className="h-10" />
          <p className="text-lg font-semibold">Santa Bárbara</p>
          <p className="text-xs text-white/80">Banco de Hojas de Vida · Talento Humano</p>
        </div>
        <div className="p-6">
          {cargando && <p className="text-center text-sm text-slate-500">Cargando…</p>}

          {!cargando && errorCarga && (
            <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{errorCarga}</p>
          )}

          {!cargando && !errorCarga && !abierta && !enviado && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{mensajeCerrado}</p>
          )}

          {!cargando && !errorCarga && abierta && !enviado && (
            <div className="flex flex-col gap-3">
              <div>
                <h1 className="text-lg font-semibold text-slate-800">Envíanos tu hoja de vida</h1>
                <p className="text-sm text-slate-500">Cuéntanos brevemente tu perfil; te contactaremos cuando surja una vacante afín.</p>
              </div>
              <Input placeholder="Nombre completo" value={form.nombre} onChange={(v) => set('nombre', v)} required />
              <div className="flex gap-2">
                <div className="w-24">
                  <select className={CAMPO} value={form.tipo_documento} onChange={(e) => set('tipo_documento', e.target.value)}>
                    <option value="CC">CC</option><option value="CE">CE</option><option value="TI">TI</option><option value="PA">PA</option>
                  </select>
                </div>
                <div className="flex-1">
                  <Input placeholder="Número de documento" value={form.numero_documento} onChange={(v) => set('numero_documento', v)} />
                </div>
              </div>
              <Input placeholder="Correo" type="email" value={form.email} onChange={(v) => set('email', v)} />
              <Input placeholder="Teléfono" value={form.telefono} onChange={(v) => set('telefono', v)} />
              <select className={CAMPO} value={form.area_interes_id} onChange={(e) => set('area_interes_id', e.target.value)}>
                <option value="">Área de interés…</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
              <Input placeholder="Cargo de interés" value={form.cargo_interes} onChange={(v) => set('cargo_interes', v)} />
              <Input placeholder="Formación (ej: Enfermería, Administración…)" value={form.formacion} onChange={(v) => set('formacion', v)} />
              <Input placeholder="Años de experiencia" type="number" min={0} value={form.experiencia_anios} onChange={(v) => set('experiencia_anios', v)} />
              <textarea className={CAMPO} rows={3} placeholder="Resumen de habilidades o certificaciones relevantes"
                value={form.habilidades} onChange={(e) => set('habilidades', e.target.value)} />
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                <span className="text-slate-600">Hoja de vida (PDF)</span>
                <span className="flex items-center gap-1 text-xs font-medium text-brand-light">
                  <Upload size={13} /> {cv?.name.slice(0, 16) ?? 'Adjuntar'}
                </span>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setCv(e.target.files?.[0] ?? null)} />
              </label>

              {/* Campo trampa para bots: invisible para personas, si llega lleno se ignora el envío */}
              <input type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1} autoComplete="off" aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }} />

              {TURNSTILE_SITE_KEY && <div ref={turnstileRef} />}

              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button disabled={enviando} onClick={enviar}
                className="rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-60">
                {enviando ? 'Enviando…' : 'Enviar mi hoja de vida'}
              </button>
            </div>
          )}

          {enviado && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={40} className="text-emerald-500" />
              <p className="text-sm text-slate-600">Recibimos tu hoja de vida. Quedó en nuestro banco de talento y te contactaremos si surge una vacante afín a tu perfil.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Input({ className = '', onChange, ...props }: { className?: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return <input {...props} onChange={(e) => onChange(e.target.value)} className={`${CAMPO} ${className}`} />
}
