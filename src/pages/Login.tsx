import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Boton, Input } from '../components/ui'
import { RecuperarPasswordModal } from '../components/RecuperarPasswordModal'
import { useAlert } from '../lib/alerts'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [modalRecuperar, setModalRecuperar] = useState(false)
  const { notify } = useAlert()

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setCargando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setCargando(false)
    if (error) notify('El correo o la contraseña no son correctos.', 'error', 'No se pudo iniciar sesión')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-dark to-brand-dark2 p-4">
      <RecuperarPasswordModal open={modalRecuperar} onClose={() => setModalRecuperar(false)} />

      <form onSubmit={entrar}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col items-center gap-2 bg-gradient-to-br from-brand to-brand-light px-8 py-7 text-center text-white">
          <img src={`${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`} alt="Clínica Santa Bárbara" className="h-12" />
          <h1 className="text-lg font-semibold">Gestión de Vacantes</h1>
          <p className="text-xs text-white/80">Procesos de Selección · Talento Humano</p>
        </div>
        <div className="flex flex-col gap-3 p-8">
          <Input label="Correo institucional" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="nombre@cacsantabarbara.co" />
          <Input label="Contraseña" type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)} />
          <Boton type="submit" disabled={cargando} className="mt-2 w-full">
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </Boton>
          <button type="button" onClick={() => setModalRecuperar(true)}
            className="text-center text-xs text-brand-light hover:underline">
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </form>
    </div>
  )
}
