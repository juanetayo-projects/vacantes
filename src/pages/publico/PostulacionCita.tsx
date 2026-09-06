import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Calendar, MapPin } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function PostulacionCita() {
  const { token } = useParams()
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState<{ candidato: string; cargo: string; fecha: string | null; lugar: string | null; tipo: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<'confirmar' | 'rechazar' | 'aplazar' | null>(null)

  useEffect(() => {
    supabase.functions.invoke('portal-candidato', { body: { accion: 'validar_token', token } })
      .then(({ data, error }) => {
        if (error || data?.error) setError(data?.error ?? 'Este enlace no es válido.')
        else setInfo(data)
        setCargando(false)
      })
  }, [token])

  async function responder(decision: 'confirmar' | 'rechazar' | 'aplazar') {
    setEnviando(true); setError('')
    const { data, error } = await supabase.functions.invoke('portal-candidato', {
      body: { accion: 'responder_cita', token, decision },
    })
    setEnviando(false)
    if (error || data?.error) setError(data?.error ?? 'No se pudo registrar tu respuesta.')
    else setResultado(decision)
  }

  const esMedica = info?.tipo === 'medicina_laboral'
  const titulo = esMedica ? 'Cita de Medicina Laboral' : 'Invitación a Entrevista'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand to-brand-dark2 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-brand to-brand-light px-6 py-5 text-center text-white">
          <p className="text-lg font-semibold">Santa Bárbara</p>
          <p className="text-xs text-white/80">Procesos de Selección · Talento Humano</p>
        </div>
        <div className="p-6">
          {cargando && <p className="text-center text-sm text-slate-500">Cargando…</p>}
          {!cargando && error && !resultado && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
          {!cargando && info && !resultado && (
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-lg font-semibold text-slate-800">{titulo}</h1>
                <p className="text-sm text-slate-500">Hola {info.candidato}, para el cargo de <strong>{info.cargo}</strong>.</p>
              </div>
              <div className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <p className="flex items-center gap-2"><Calendar size={14} className="text-brand-light" />
                  {info.fecha ? new Date(info.fecha).toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Bogota' }) : 'Por confirmar'}
                </p>
                <p className="flex items-center gap-2"><MapPin size={14} className="text-brand-light" /> {info.lugar ?? 'Por confirmar'}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button disabled={enviando} onClick={() => responder('confirmar')}
                  className="rounded-lg bg-emerald-500 py-2.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">Confirmar</button>
                <button disabled={enviando} onClick={() => responder('aplazar')}
                  className="rounded-lg bg-amber-500 py-2.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60">Aplazar</button>
                <button disabled={enviando} onClick={() => responder('rechazar')}
                  className="rounded-lg bg-rose-500 py-2.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-60">Rechazar</button>
              </div>
              {error && <p className="text-xs text-rose-600">{error}</p>}
            </div>
          )}
          {resultado && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={40} className="text-emerald-500" />
              <p className="text-sm text-slate-600">
                {resultado === 'confirmar' && 'Confirmamos tu asistencia. ¡Te esperamos!'}
                {resultado === 'aplazar' && 'Registramos tu solicitud de aplazamiento. Nuestro equipo te contactará para reprogramar.'}
                {resultado === 'rechazar' && 'Registramos tu respuesta. Gracias por avisarnos.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
