import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function EstadoAutopostulacion() {
  const { perfil } = useAuth()
  const [abierta, setAbierta] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.from('configuracion_publica').select('autopostulacion_abierta').eq('id', true).single()
      .then(({ data }) => setAbierta(data?.autopostulacion_abierta ?? null))
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
