import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Boton, Input } from '../components/ui'
import { useAlert } from '../lib/alerts'

export default function Reset() {
  const [listo, setListo] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [ok, setOk] = useState(false)
  const navigate = useNavigate()
  const { notify } = useAlert()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) return setListo(true)
      const href = window.location.href
      const at = href.match(/[#&?]access_token=([^&]+)/)?.[1]
      const rt = href.match(/[#&?]refresh_token=([^&]+)/)?.[1]
      if (!at || !rt) return setError('El enlace expiró o no es válido.')
      supabase.auth
        .setSession({ access_token: decodeURIComponent(at), refresh_token: decodeURIComponent(rt) })
        .then(({ error }) => (error ? setError('El enlace expiró o no es válido.') : setListo(true)))
    })
  }, [])

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      notify(error.message, 'error', 'No se pudo actualizar la contraseña')
      return
    }
    setOk(true)
    notify('Tu contraseña se actualizó correctamente.', 'success')
    setTimeout(() => navigate('/'), 1200)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-dark to-brand-dark2 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col items-center gap-2 bg-gradient-to-br from-brand to-brand-light px-8 py-7 text-center text-white">
          <img src={`${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`} alt="Clínica Santa Bárbara" className="h-12" />
          <h1 className="text-lg font-semibold">Nueva contraseña</h1>
        </div>
        <div className="p-8">
          {ok ? (
            <p className="text-sm text-emerald-600">Contraseña actualizada. Redirigiendo...</p>
          ) : (
            <form onSubmit={guardar} className="flex flex-col gap-3">
              <Input label="Nueva contraseña" type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)} />
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <Boton type="submit" disabled={!listo}>Guardar</Boton>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
