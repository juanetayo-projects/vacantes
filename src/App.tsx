import { HashRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { useState, type ReactElement, type ReactNode } from 'react'
import {
  Home, Briefcase, FileText, ClipboardList, Users, ClipboardCheck,
  UserCheck, GraduationCap, BarChart3, Settings, LogOut, Bell, Menu,
} from 'lucide-react'
import { AuthProvider, useAuth } from './lib/auth'
import { AlertProvider } from './lib/alerts'
import { supabase } from './lib/supabase'

import Login from './pages/Login'
import Reset from './pages/Reset'
import Dashboard from './pages/Dashboard'
import VacantesActivas from './pages/VacantesActivas'
import NuevaSolicitud from './pages/NuevaSolicitud'
import Solicitudes from './pages/Solicitudes'
import VacanteAprobacion from './pages/VacanteAprobacion'
import Requisiciones from './pages/Requisiciones'
import CandidatosKanban from './pages/CandidatosKanban'
import ListaCandidatos from './pages/ListaCandidatos'
import EvaluacionCandidato from './pages/EvaluacionCandidato'
import Contratacion from './pages/Contratacion'
import Induccion from './pages/Induccion'
import Reportes from './pages/Reportes'
import PerfilUsuario from './pages/PerfilUsuario'
import AdminUsuarios from './pages/admin/Usuarios'

function SoloInvitados({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth()
  if (loading) return <Cargando />
  if (session) return <Navigate to="/" replace />
  return children
}

function Guard({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth()
  if (loading) return <Cargando />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function Cargando() {
  return <div className="flex min-h-screen items-center justify-center text-slate-500">Cargando…</div>
}

const NAV = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/vacantes', label: 'Vacantes', icon: Briefcase },
  { to: '/solicitudes', label: 'Solicitudes', icon: FileText },
  { to: '/requisiciones', label: 'Requisiciones', icon: ClipboardList },
  { to: '/candidatos', label: 'Candidatos', icon: Users },
  { to: '/evaluaciones', label: 'Evaluaciones', icon: ClipboardCheck },
  { to: '/contrataciones', label: 'Contrataciones', icon: UserCheck },
  { to: '/induccion', label: 'Inducción', icon: GraduationCap },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
]

function Layout({ children }: { children: ReactNode }) {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)

  async function salir() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-fondo-app">
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 transform bg-gradient-to-b from-brand to-brand-dark2 text-white transition-transform
        lg:static lg:translate-x-0 ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
          <img src={`${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`} alt="CAC" className="h-9" />
          <span className="text-sm font-semibold leading-tight">Gestión de<br />Vacantes</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenuAbierto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-white/15 font-medium' : 'text-white/80 hover:bg-white/10'
                }`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
          {(perfil?.role === 'admin' || perfil?.perm_configuracion) && (
            <NavLink to="/admin/usuarios" onClick={() => setMenuAbierto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-white/15 font-medium' : 'text-white/80 hover:bg-white/10'
                }`}>
              <Settings size={18} /> Configuración
            </NavLink>
          )}
        </nav>
      </aside>

      {menuAbierto && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenuAbierto(false)} />
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-300 bg-white px-4 py-3 shadow-sm">
          <button className="lg:hidden" onClick={() => setMenuAbierto(true)}><Menu /></button>
          <div className="hidden text-sm text-slate-500 lg:block">
            Sistema de Gestión de Vacantes y Procesos de Selección
          </div>
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-slate-400" />
            <NavLink to="/perfil" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                {perfil?.nombre?.slice(0, 2).toUpperCase() ?? '..'}
              </div>
              <span className="hidden text-sm font-medium text-slate-700 sm:block">{perfil?.nombre}</span>
            </NavLink>
            <button onClick={salir} title="Cerrar sesión" className="text-slate-400 hover:text-rose-500">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}

function Rutas() {
  return (
    <Routes>
      <Route path="/login" element={<SoloInvitados><Login /></SoloInvitados>} />
      <Route path="/reset" element={<Reset />} />
      <Route path="/*" element={
        <Guard>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/vacantes" element={<VacantesActivas />} />
              <Route path="/solicitudes" element={<Solicitudes />} />
              <Route path="/solicitudes/nueva" element={<NuevaSolicitud />} />
              <Route path="/vacantes/:id/editar" element={<NuevaSolicitud />} />
              <Route path="/vacantes/:id/aprobacion" element={<VacanteAprobacion />} />
              <Route path="/vacantes/:id/candidatos" element={<CandidatosKanban />} />
              <Route path="/requisiciones" element={<Requisiciones />} />
              <Route path="/candidatos" element={<ListaCandidatos />} />
              <Route path="/evaluaciones" element={<ListaCandidatos modo="evaluaciones" />} />
              <Route path="/postulaciones/:id/evaluacion" element={<EvaluacionCandidato />} />
              <Route path="/contrataciones" element={<ListaCandidatos modo="contrataciones" />} />
              <Route path="/postulaciones/:id/contratacion" element={<Contratacion />} />
              <Route path="/induccion" element={<ListaCandidatos modo="induccion" />} />
              <Route path="/postulaciones/:id/induccion" element={<Induccion />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/perfil" element={<PerfilUsuario />} />
              <Route path="/admin/usuarios" element={<AdminUsuarios />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Guard>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        <HashRouter>
          <Rutas />
        </HashRouter>
      </AlertProvider>
    </AuthProvider>
  )
}
