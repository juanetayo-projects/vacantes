import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'
import type { Tables } from './database.types'

export type Perfil = Tables<'profiles'>

type AuthCtx = {
  session: Session | null
  perfil: Perfil | null
  loading: boolean
  refrescarPerfil: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  session: null,
  perfil: null,
  loading: true,
  refrescarPerfil: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)

  async function cargarPerfil(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) setPerfil(data)
  }

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session)
        if (data.session) cargarPerfil(data.session.user.id)
      })
      .finally(() => setLoading(false))

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) cargarPerfil(s.user.id)
      else setPerfil(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <Ctx.Provider
      value={{
        session,
        perfil,
        loading,
        refrescarPerfil: async () => {
          if (session) await cargarPerfil(session.user.id)
        },
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  solicitante: 'Jefe de Área',
  aprobador: 'Jefe Directo / Gerencia',
  reclutador: 'Talento Humano / Reclutador',
  direccion: 'Dirección General',
}
