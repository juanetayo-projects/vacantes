import { useState, type FormEvent } from 'react'
import { Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Modal, Boton, Input } from './ui'

export function RecuperarPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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

  function cerrar() {
    onClose()
    setTimeout(() => { setEnviado(false); setEmail('') }, 200)
  }

  return (
    <Modal open={open} onClose={cerrar} titulo="Recuperar contraseña" ancho="max-w-sm">
      {enviado ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand">
            <Mail size={22} />
          </div>
          <p className="text-sm text-slate-600">
            Si el correo <b>{email}</b> existe en el sistema, te enviamos un enlace para restablecer tu contraseña.
          </p>
          <Boton variante="secundario" onClick={cerrar} className="mt-1">Entendido</Boton>
        </div>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">
            Ingresa tu correo institucional y te enviaremos un enlace para restablecer tu contraseña.
          </p>
          <Input label="Correo institucional" type="email" required autoFocus value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="nombre@cacsantabarbara.co" />
          <div className="mt-1 flex justify-end gap-2">
            <Boton type="button" variante="secundario" onClick={cerrar}>Cancelar</Boton>
            <Boton type="submit" disabled={cargando}>{cargando ? 'Enviando…' : 'Enviar enlace'}</Boton>
          </div>
        </form>
      )}
    </Modal>
  )
}
