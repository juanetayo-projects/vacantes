import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Boton, Input } from '../components/ui'

export default function Reset() {
  const [listo, setListo] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [ok, setOk] = useState(false)
  const navigate = useNavigate()

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
    if (error) setError(error.message)
    else {
      setOk(true)
      setTimeout(() => navigate('/'), 1500)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-center bg-[#0D2D6B] py-6">
        <img src={`${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`} alt="Clínica Santa Bárbara" className="h-14" />
      </div>
      <div className="flex flex-1 items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="mb-4 text-lg font-semibold text-[#0D2D6B]">Nueva contraseña</h1>
          {ok ? (
            <p className="text-sm text-emerald-600">Contraseña actualizada. Redirigiendo...</p>
          ) : (
            <form onSubmit={guardar} className="flex flex-col gap-3">
              <Input label="Nueva contraseña" type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Boton type="submit" disabled={!listo}>Guardar</Boton>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
