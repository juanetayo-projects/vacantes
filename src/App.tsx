import { HashRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { useState, type ReactElement, type ReactNode } from 'react'
import {
  Home, Briefcase, FileText, ClipboardList, Users, ClipboardCheck,
  UserCheck, GraduationCap, BarChart3, Settings, LogOut, Menu, HeartPulse, Stethoscope, Archive,
} from 'lucide-react'
import { AuthProvider, useAuth } from './lib/auth'
import { AlertProvider } from './lib/alerts'
import { supabase } from './lib/supabase'
import NotificacionesBell from './components/NotificacionesBell'
import EstadoAutopostulacion from './components/EstadoAutopostulacion'

import Login from './pages/Login'
import Reset from './pages/Reset'
import PostulacionDocumentos from './pages/publico/PostulacionDocumentos'
import PostulacionCita from './pages/publico/PostulacionCita'
import PostulacionPerfilSociodemografico from './pages/publico/PostulacionPerfilSociodemografico'
import PostulacionAutopostulacion from './pages/publico/PostulacionAutopostulacion'
import Dashboard from './pages/Dashboard'
import VacantesActivas from './pages/VacantesActivas'
import NuevaSolicitud from './pages/NuevaSolicitud'
import Solicitudes from './pages/Solicitudes'
import VacanteAprobacion from './pages/VacanteAprobacion'
import Requisiciones from './pages/Requisiciones'
import CandidatosKanban from './pages/CandidatosKanban'
import ListaCandidatos from './pages/ListaCandidatos'
import BancoHV from './pages/BancoHV'
import EvaluacionCandidato from './pages/EvaluacionCandidato'
import Contratacion from './pages/Contratacion'
import Induccion from './pages/Induccion'
import Reportes from './pages/Reportes'
import PerfilUsuario from './pages/PerfilUsuario'
import AdminUsuarios from './pages/admin/Usuarios'
import AgendaMedicinaLaboral from './pages/AgendaMedicinaLaboral'
import EvaluacionMedicaLaboral from './pages/EvaluacionMedicaLaboral'

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
  { to: '/banco-hv', label: 'Banco de HV', icon: Archive },
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
        <div className="flex flex-col items-center gap-2 border-b border-white/10 px-4 py-5 text-center">
          <img src={`${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`} alt="CAC" className="h-10" />
          <span className="text-sm font-semibold leading-tight">Gestión de Vacantes</span>
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
          {(perfil?.role === 'admin' || perfil?.role === 'agenda_citas') && (
            <NavLink to="/agenda-medicina-laboral" onClick={() => setMenuAbierto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-white/15 font-medium' : 'text-white/80 hover:bg-white/10'
                }`}>
              <HeartPulse size={18} /> Agenda Médico Laboral
            </NavLink>
          )}
          {(perfil?.role === 'admin' || perfil?.role === 'medico_laboral') && (
            <NavLink to="/evaluacion-medica-laboral" onClick={() => setMenuAbierto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-white/15 font-medium' : 'text-white/80 hover:bg-white/10'
                }`}>
              <Stethoscope size={18} /> Evaluación Médica
            </NavLink>
          )}
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
        <header className="flex items-center justify-between bg-gradient-to-r from-brand to-brand-dark2 px-4 py-3 shadow-md">
          <button className="text-white lg:hidden" onClick={() => setMenuAbierto(true)}><Menu /></button>
          <div className="hidden text-sm text-white/80 lg:block">
            Sistema de Gestión de Vacantes y Procesos de Selección
          </div>
          <div className="flex items-center gap-3">
            <EstadoAutopostulacion />
            <NotificacionesBell />
            <NavLink to="/perfil" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white ring-1 ring-white/30">
                {perfil?.nombre?.slice(0, 2).toUpperCase() ?? '..'}
              </div>
              <span className="hidden text-sm font-medium text-white sm:block">{perfil?.nombre}</span>
            </NavLink>
            <button onClick={salir} title="Cerrar sesión" className="text-white/70 hover:text-white">
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
      <Route path="/postulacion/documentos/:token" element={<PostulacionDocumentos />} />
      <Route path="/postulacion/cita/:token" element={<PostulacionCita />} />
      <Route path="/postulacion/perfil-sociodemografico/:token" element={<PostulacionPerfilSociodemografico />} />
      <Route path="/postulacion/autopostulacion" element={<PostulacionAutopostulacion />} />
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
              <Route path="/banco-hv" element={<BancoHV />} />
              <Route path="/evaluaciones" element={<ListaCandidatos modo="evaluaciones" />} />
              <Route path="/postulaciones/:id/evaluacion" element={<EvaluacionCandidato />} />
              <Route path="/contrataciones" element={<ListaCandidatos modo="contrataciones" />} />
              <Route path="/postulaciones/:id/contratacion" element={<Contratacion />} />
              <Route path="/induccion" element={<ListaCandidatos modo="induccion" />} />
              <Route path="/postulaciones/:id/induccion" element={<Induccion />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/perfil" element={<PerfilUsuario />} />
              <Route path="/admin/usuarios" element={<AdminUsuarios />} />
              <Route path="/agenda-medicina-laboral" element={<AgendaMedicinaLaboral />} />
              <Route path="/evaluacion-medica-laboral" element={<EvaluacionMedicaLaboral />} />
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
