import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Tables } from '../lib/database.types'
import { formatoFecha } from '../lib/data'

const COLOR_TIPO: Record<string, string> = {
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
}

export default function NotificacionesBell() {
  const { perfil } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Tables<'notificaciones'>[]>([])
  const ref = useRef<HTMLDivElement>(null)

  async function cargar() {
    if (!perfil) return
    const { data } = await supabase.from('notificaciones').select('*')
      .eq('usuario_id', perfil.id).order('created_at', { ascending: false }).limit(15)
    setNotificaciones(data ?? [])
  }

  useEffect(() => { cargar() }, [perfil?.id])

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  const noLeidas = notificaciones.filter((n) => !n.leida).length

  async function abrir() {
    setAbierto((v) => !v)
    if (!abierto && noLeidas && perfil) {
      await supabase.from('notificaciones').update({ leida: true }).eq('usuario_id', perfil.id).eq('leida', false)
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={abrir} className="relative text-white/70 hover:text-white">
        <Bell size={18} />
        {noLeidas > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {noLeidas}
          </span>
        )}
      </button>
      {abierto && (
        <div className="absolute right-0 top-8 z-50 max-h-96 w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Notificaciones</div>
          {!notificaciones.length && <p className="px-4 py-6 text-center text-sm text-slate-400">No tienes notificaciones</p>}
          {notificaciones.map((n) => (
            <div key={n.id} className="flex gap-2.5 border-b border-slate-50 px-4 py-2.5 last:border-0">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${COLOR_TIPO[n.tipo ?? ''] ?? 'bg-slate-300'}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700">{n.titulo}</p>
                {n.mensaje && <p className="text-xs text-slate-500">{n.mensaje}</p>}
                <p className="mt-0.5 text-[11px] text-slate-400">{formatoFecha(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
