import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Boton, Input } from '../components/ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [cargando, setCargando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    setCargando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg('Credenciales inválidas')
    setCargando(false)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-center bg-[#0D2D6B] py-6">
        <img src={`${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`} alt="Clínica Santa Bárbara" className="h-14" />
      </div>
      <div className="flex flex-1 items-center justify-center bg-slate-100 p-4">
        <form onSubmit={entrar} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-6 flex flex-col items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}images/logo_cacsb2.png`} alt="Clínica Santa Bárbara" className="h-12" />
            <h1 className="text-lg font-semibold text-[#0D2D6B]">Gestión de Vacantes</h1>
            <p className="text-xs text-slate-500">Procesos de Selección · Talento Humano</p>
          </div>
          <div className="flex flex-col gap-3">
            <Input label="Correo institucional" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="nombre@cacsantabarbara.co" />
            <Input label="Contraseña" type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </div>
          {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
          <Boton type="submit" disabled={cargando} className="mt-5 w-full">
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </Boton>
          <div className="mt-4 text-center">
            <Link to="/olvide" className="text-xs text-[#16468E] hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
