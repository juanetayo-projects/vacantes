import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function EstadoAutopostulacion() {
  const { perfil } = useAuth()
  const [abierta, setAbierta] = useState<boolean | null>(null)

  function cargar() {
    supabase.from('configuracion_publica').select('autopostulacion_abierta').eq('id', true).single()
      .then(({ data }) => setAbierta(data?.autopostulacion_abierta ?? null))
  }

  useEffect(() => {
    cargar()

    const canal = supabase
      .channel('configuracion_publica_header')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'configuracion_publica' },
        (payload) => setAbierta((payload.new as { autopostulacion_abierta: boolean }).autopostulacion_abierta))
      .subscribe()

    function alVolverAEnfocar() {
      if (document.visibilityState === 'visible') cargar()
    }
    document.addEventListener('visibilitychange', alVolverAEnfocar)

    return () => {
      supabase.removeChannel(canal)
      document.removeEventListener('visibilitychange', alVolverAEnfocar)
    }
  }, [])

  if (abierta === null) return null

  const puedeAdministrar = perfil?.role === 'admin' || !!perfil?.perm_configuracion
  const contenido = abierta ? (
    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-100 sm:px-2.5">
      <CircleCheck size={14} />
      <span className="hidden sm:inline">Autopostulación abierta</span>
    </span>
  ) : (
    <span className="flex animate-pulse items-center gap-1.5 rounded-full bg-amber-500/90 px-2 py-1 text-xs font-semibold text-white sm:px-2.5">
      <CircleAlert size={14} />
      <span className="hidden sm:inline">Autopostulación cerrada</span>
    </span>
  )

  if (!puedeAdministrar) return contenido

  return (
    <NavLink to="/admin/usuarios?tab=banco_hv" title="Ir a Configuración · Banco de HV">
      {contenido}
    </NavLink>
  )
}
