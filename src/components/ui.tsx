import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

// --- Card de métrica con degradado institucional ---
export function MetricCard({
  titulo, valor, icono, sub,
}: { titulo: string; valor: ReactNode; icono?: ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl p-5 text-white shadow-md
                    bg-gradient-to-br from-[#0D2D6B] to-[#16468E]">
      <div className="flex items-center justify-between">
        <span className="text-sm/5 opacity-80">{titulo}</span>
        {icono}
      </div>
      <div className="mt-2 text-3xl font-bold">{valor}</div>
      {sub && <div className="mt-1 text-xs opacity-75">{sub}</div>}
    </div>
  )
}

// --- Encabezado de página ---
export function PageHeader({ titulo, subtitulo, acciones }:
  { titulo: string; subtitulo?: string; acciones?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 className="text-xl font-semibold text-[#0D2D6B]">{titulo}</h1>
        {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
      </div>
      <div className="flex gap-2">{acciones}</div>
    </div>
  )
}

// --- Barra de filtros reutilizable ---
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl
                    border border-slate-200 bg-white p-4 shadow-sm">
      {children}
    </div>
  )
}

// --- Card genérica ---
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

// --- Modal reutilizable ---
export function Modal({ open, onClose, titulo, children, ancho = 'max-w-lg' }:
  { open: boolean; onClose: () => void; titulo?: string; children: ReactNode; ancho?: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
         onClick={onClose}>
      <div className={`w-full ${ancho} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl`}
           onClick={(e) => e.stopPropagation()}>
        {titulo && (
          <div className="sticky top-0 rounded-t-2xl bg-[#0D2D6B] px-5 py-3 text-white font-medium">
            {titulo}
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// --- Botón primario institucional ---
export function Boton({ children, className = '', variante = 'primario', ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'secundario' | 'peligro' | 'exito' }) {
  const estilos: Record<string, string> = {
    primario: 'bg-[#0D2D6B] text-white hover:bg-[#16468E]',
    secundario: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    peligro: 'bg-red-600 text-white hover:bg-red-700',
    exito: 'bg-emerald-600 text-white hover:bg-emerald-700',
  }
  return (
    <button {...props}
      className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${estilos[variante]} ${className}`}>
      {children}
    </button>
  )
}

// --- Badge de estado ---
const BADGE_COLORS: Record<string, string> = {
  borrador: 'bg-slate-100 text-slate-600',
  pendiente_aprobacion: 'bg-amber-100 text-amber-700',
  pendiente: 'bg-amber-100 text-amber-700',
  aprobada: 'bg-emerald-100 text-emerald-700',
  aprobado: 'bg-emerald-100 text-emerald-700',
  rechazada: 'bg-red-100 text-red-700',
  rechazado: 'bg-red-100 text-red-700',
  modificacion_solicitada: 'bg-orange-100 text-orange-700',
  en_requisicion: 'bg-sky-100 text-sky-700',
  publicada: 'bg-blue-100 text-blue-700',
  en_evaluacion: 'bg-violet-100 text-violet-700',
  en_oferta: 'bg-indigo-100 text-indigo-700',
  contratada: 'bg-teal-100 text-teal-700',
  en_induccion: 'bg-cyan-100 text-cyan-700',
  cerrada: 'bg-slate-200 text-slate-700',
  cancelada: 'bg-red-100 text-red-700',
  bajo: 'bg-slate-100 text-slate-600',
  medio: 'bg-amber-100 text-amber-700',
  alto: 'bg-orange-100 text-orange-700',
  critico: 'bg-red-100 text-red-700',
  completado: 'bg-emerald-100 text-emerald-700',
  recibido: 'bg-sky-100 text-sky-700',
  postulado: 'bg-slate-100 text-slate-600',
  preseleccionado: 'bg-sky-100 text-sky-700',
  entrevista: 'bg-amber-100 text-amber-700',
  finalista: 'bg-violet-100 text-violet-700',
  seleccionado: 'bg-emerald-100 text-emerald-700',
  no_seleccionado: 'bg-red-100 text-red-700',
  descartado: 'bg-red-100 text-red-700',
}

export function Badge({ texto, valor }: { texto: string; valor?: string }) {
  const cls = BADGE_COLORS[valor ?? texto.toLowerCase()] ?? 'bg-slate-100 text-slate-600'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${cls}`}>{texto}</span>
}

// --- Stepper para wizards de varios pasos ---
export function Stepper({ pasos, actual }: { pasos: string[]; actual: number }) {
  return (
    <div className="mb-6 flex items-center">
      {pasos.map((p, i) => (
        <div key={p} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold
              ${i < actual ? 'bg-[#0D2D6B] text-white' : i === actual ? 'bg-[#16468E] text-white ring-4 ring-blue-100' : 'bg-slate-200 text-slate-500'}`}>
              {i + 1}
            </div>
            <span className={`text-[11px] whitespace-nowrap ${i === actual ? 'text-[#0D2D6B] font-medium' : 'text-slate-400'}`}>{p}</span>
          </div>
          {i < pasos.length - 1 && (
            <div className={`mx-2 h-0.5 flex-1 ${i < actual ? 'bg-[#0D2D6B]' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export function Input({ label, ...props }: { label?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-medium text-slate-600">{label}</span>}
      <input {...props}
        className={`rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#16468E] focus:outline-none focus:ring-1 focus:ring-[#16468E] ${props.className ?? ''}`} />
    </label>
  )
}

export function Select({ label, children, ...props }:
  { label?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-medium text-slate-600">{label}</span>}
      <select {...props}
        className={`rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#16468E] focus:outline-none focus:ring-1 focus:ring-[#16468E] ${props.className ?? ''}`}>
        {children}
      </select>
    </label>
  )
}

export function Textarea({ label, ...props }: { label?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-medium text-slate-600">{label}</span>}
      <textarea {...props}
        className={`rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#16468E] focus:outline-none focus:ring-1 focus:ring-[#16468E] ${props.className ?? ''}`} />
    </label>
  )
}
