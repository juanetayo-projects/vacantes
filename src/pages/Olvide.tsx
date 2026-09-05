import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Boton, Input } from '../components/ui'

export default function Olvide() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [cargando, setCargando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setCargando(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}#/reset`,
    })
    setCargando(false)
    setEnviado(true)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-center bg-[#0D2D6B] py-6">
        <img src={`${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`} alt="Clínica Santa Bárbara" className="h-14" />
      </div>
      <div className="flex flex-1 items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="mb-4 text-lg font-semibold text-[#0D2D6B]">Recuperar contraseña</h1>
          {enviado ? (
            <p className="text-sm text-slate-600">
              Si el correo existe, te enviamos un enlace para restablecer tu contraseña.
            </p>
          ) : (
            <form onSubmit={enviar} className="flex flex-col gap-3">
              <Input label="Correo institucional" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} />
              <Boton type="submit" disabled={cargando}>{cargando ? 'Enviando...' : 'Enviar enlace'}</Boton>
            </form>
          )}
          <div className="mt-4 text-center">
            <Link to="/login" className="text-xs text-[#16468E] hover:underline">Volver a iniciar sesión</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
