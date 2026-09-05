import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'
import { X } from 'lucide-react'

// --- Card de métrica con degradado institucional (compacta) ---
export function MetricCard({
  titulo, valor, icono, sub,
}: { titulo: string; valor: ReactNode; icono?: ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl p-3.5 text-white shadow-lg shadow-brand/20
                    bg-gradient-to-br from-brand to-brand-light">
      <div className="flex items-center justify-between">
        <span className="text-xs opacity-80">{titulo}</span>
        {icono}
      </div>
      <div className="mt-1 text-2xl font-bold leading-tight">{valor}</div>
      {sub && <div className="mt-0.5 text-[11px] opacity-75">{sub}</div>}
    </div>
  )
}

// --- Encabezado de página ---
export function PageHeader({ titulo, subtitulo, acciones }:
  { titulo: string; subtitulo?: string; acciones?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 className="text-xl font-semibold text-brand">{titulo}</h1>
        {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
      </div>
      <div className="flex gap-2">{acciones}</div>
    </div>
  )
}

// --- Barra de filtros reutilizable (versión completa, con marco propio) ---
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl
                    border border-slate-300 bg-white p-4 shadow-md">
      {children}
    </div>
  )
}

// --- Barra de filtros compacta: una sola línea, sin ocupar alto extra ---
export function FilterBarCompacta({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-300
                    bg-white px-3 py-1.5 shadow-sm">
      {children}
    </div>
  )
}

// --- Card genérica. Si se pasa `titulo`, se dibuja un header con fondo
// tintado que separa visualmente el título del contenido. ---
export function Card({ children, className = '', titulo, acciones }:
  { children: ReactNode; className?: string; titulo?: ReactNode; acciones?: ReactNode }) {
  if (titulo) {
    return (
      <div className={`overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md ${className}`}>
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-brand-50 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-brand">{titulo}</h2>
          {acciones}
        </div>
        <div className="p-4">{children}</div>
      </div>
    )
  }
  return (
    <div className={`rounded-xl border border-slate-300 bg-white p-5 shadow-md ${className}`}>
      {children}
    </div>
  )
}

// --- Contenedor de tabla con encabezado oscuro y filas en cebra ---
export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-md">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  )
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-brand text-xs uppercase tracking-wide text-white">
      <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">{children}</tr>
    </thead>
  )
}

/** Clase para <tr>: filas pares blancas, impares con tinte institucional suave. */
export function filaZebra(index: number) {
  return `border-t border-slate-200 transition-colors hover:bg-brand-50 ${index % 2 === 1 ? 'bg-brand-50/60' : 'bg-white'}`
}

export function TableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-400">{children}</td>
    </tr>
  )
}

/** contentStyle listo para <Tooltip/> de Recharts, con fondo oscuro institucional. */
export const tooltipOscuroProps = {
  contentStyle: { background: '#0D2D6B', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 },
  itemStyle: { color: '#fff' },
  labelStyle: { color: '#EAF0FA' },
}

// --- Modal reutilizable: siempre con botón de cerrar ---
export function Modal({ open, onClose, titulo, children, ancho = 'max-w-lg' }:
  { open: boolean; onClose: () => void; titulo?: string; children: ReactNode; ancho?: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-modal-overlay"
         onClick={onClose}>
      <div className={`w-full ${ancho} max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-modal-card`}
           onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-brand to-brand-light px-5 py-3 text-white">
          <span className="font-medium">{titulo}</span>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-1 text-white/80 hover:bg-white/15 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// --- Botón primario institucional ---
export function Boton({ children, className = '', variante = 'primario', ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'secundario' | 'peligro' | 'exito' }) {
  const estilos: Record<string, string> = {
    primario: 'bg-brand text-white hover:bg-brand-light',
    secundario: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300',
    peligro: 'bg-peligro text-white hover:bg-rose-700',
    exito: 'bg-exito text-white hover:bg-emerald-600',
  }
  return (
    <button {...props}
      className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${estilos[variante]} ${className}`}>
      {children}
    </button>
  )
}

// --- Botón de cerrar/cancelar genérico (icono X), para usar en esquinas de cards no-modales ---
export function BotonCerrar({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} aria-label="Cerrar"
      className={`rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 ${className}`}>
      <X size={18} />
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
  rechazada: 'bg-rose-100 text-rose-700',
  rechazado: 'bg-rose-100 text-rose-700',
  modificacion_solicitada: 'bg-orange-100 text-orange-700',
  en_requisicion: 'bg-sky-100 text-sky-700',
  publicada: 'bg-blue-100 text-blue-700',
  en_evaluacion: 'bg-violet-100 text-violet-700',
  en_oferta: 'bg-indigo-100 text-indigo-700',
  contratada: 'bg-teal-100 text-teal-700',
  en_induccion: 'bg-cyan-100 text-cyan-700',
  cerrada: 'bg-slate-200 text-slate-700',
  cancelada: 'bg-rose-100 text-rose-700',
  bajo: 'bg-slate-100 text-slate-600',
  medio: 'bg-amber-100 text-amber-700',
  alto: 'bg-orange-100 text-orange-700',
  critico: 'bg-rose-100 text-rose-700',
  completado: 'bg-emerald-100 text-emerald-700',
  recibido: 'bg-sky-100 text-sky-700',
  postulado: 'bg-slate-100 text-slate-600',
  preseleccionado: 'bg-sky-100 text-sky-700',
  entrevista: 'bg-amber-100 text-amber-700',
  finalista: 'bg-violet-100 text-violet-700',
  seleccionado: 'bg-emerald-100 text-emerald-700',
  no_seleccionado: 'bg-rose-100 text-rose-700',
  descartado: 'bg-rose-100 text-rose-700',
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
              ${i < actual ? 'bg-brand text-white' : i === actual ? 'bg-brand-light text-white ring-4 ring-brand-50' : 'bg-slate-200 text-slate-500'}`}>
              {i + 1}
            </div>
            <span className={`text-[11px] whitespace-nowrap ${i === actual ? 'text-brand font-medium' : 'text-slate-400'}`}>{p}</span>
          </div>
          {i < pasos.length - 1 && (
            <div className={`mx-2 h-0.5 flex-1 ${i < actual ? 'bg-brand' : 'bg-slate-200'}`} />
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
        className={`rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light ${props.className ?? ''}`} />
    </label>
  )
}

/** Input de dinero: guarda solo dígitos (string) pero muestra con separador de miles y sufijo COP. */
export function InputMoneda({ label, value, onChange, className = '', ...props }:
  { label?: string; value: string; onChange: (valor: string) => void } &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  const formateado = value ? new Intl.NumberFormat('es-CO').format(Number(value)) : ''
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-medium text-slate-600">{label}</span>}
      <div className={`flex items-center rounded-lg border border-slate-300 focus-within:border-brand-light focus-within:ring-1 focus-within:ring-brand-light ${className}`}>
        <span className="pl-3 text-sm text-slate-400">$</span>
        <input {...props} type="text" inputMode="numeric" value={formateado}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
          className="w-full min-w-0 bg-transparent px-2 py-2 text-sm outline-none" />
        <span className="pr-3 text-xs text-slate-400">COP</span>
      </div>
    </label>
  )
}

export function Select({ label, children, ...props }:
  { label?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-medium text-slate-600">{label}</span>}
      <select {...props}
        className={`rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light ${props.className ?? ''}`}>
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
        className={`rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light ${props.className ?? ''}`} />
    </label>
  )
}
