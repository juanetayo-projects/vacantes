import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const TIPOS_DOCUMENTO = [
  { tipo: 'cedula', label: 'Cédula de Ciudadanía' },
  { tipo: 'diploma', label: 'Diploma o Certificado de Estudios' },
  { tipo: 'certificaciones', label: 'Certificaciones Laborales' },
]

function leerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function PostulacionDocumentos() {
  const { token } = useParams()
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState<{ candidato: string; cargo: string } | null>(null)
  const [archivos, setArchivos] = useState<Record<string, File | null>>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    setCargando(true); setError(''); setInfo(null)
    supabase.functions.invoke('portal-candidato', { body: { accion: 'validar_token', token } })
      .then(({ data, error }) => {
        if (error || data?.error) setError(data?.error ?? 'Este enlace no es válido.')
        else setInfo(data)
        setCargando(false)
      })
  }, [token])

  async function enviar() {
    const documentos = []
    for (const { tipo } of TIPOS_DOCUMENTO) {
      const file = archivos[tipo]
      if (!file) continue
      documentos.push({ tipo, nombreArchivo: file.name, contenidoBase64: await leerComoBase64(file) })
    }
    if (!documentos.length) { setError('Adjunta al menos un documento.'); return }
    setEnviando(true); setError('')
    const { data, error } = await supabase.functions.invoke('portal-candidato', {
      body: { accion: 'enviar_documentos', token, documentos },
    })
    setEnviando(false)
    if (error || data?.error) setError(data?.error ?? 'No se pudieron enviar los documentos.')
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
        <div className="p-6">
          {cargando && <p className="text-center text-sm text-slate-500">Cargando…</p>}
          {!cargando && error && !enviado && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
          {!cargando && info && !enviado && (
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-lg font-semibold text-slate-800">Hola, {info.candidato}</h1>
                <p className="text-sm text-slate-500">Adjunta la documentación solicitada para el cargo de <strong>{info.cargo}</strong>.</p>
              </div>
              {TIPOS_DOCUMENTO.map(({ tipo, label }) => (
                <label key={tipo} className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-brand-light">
                    <Upload size={13} /> {archivos[tipo]?.name.slice(0, 14) ?? 'Adjuntar'}
                  </span>
                  <input type="file" className="hidden" onChange={(e) => setArchivos((prev) => ({ ...prev, [tipo]: e.target.files?.[0] ?? null }))} />
                </label>
              ))}
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button disabled={enviando} onClick={enviar}
                className="rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-60">
                {enviando ? 'Enviando…' : 'Enviar documentación'}
              </button>
            </div>
          )}
          {enviado && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={40} className="text-emerald-500" />
              <p className="text-sm text-slate-600">Recibimos tu documentación. Nuestro equipo de Talento Humano la validará y te contactaremos pronto.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
