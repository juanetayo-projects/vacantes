export const ESTADO_VACANTE_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  pendiente_aprobacion: 'En Aprobación',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  en_requisicion: 'En Requisición',
  publicada: 'Publicada',
  en_evaluacion: 'En Evaluación',
  en_oferta: 'En Oferta',
  contratada: 'Contratada',
  en_induccion: 'En Inducción',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada',
}

export const URGENCIA_LABELS: Record<string, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
  critico: 'Crítico',
}

export const TIPO_VACANTE_LABELS: Record<string, string> = {
  creacion: 'Creación',
  reemplazo: 'Reemplazo',
  expansion: 'Expansión',
}

export const ESTADO_POSTULACION_LABELS: Record<string, string> = {
  postulado: 'Postulado',
  preseleccionado: 'Preseleccionado',
  entrevista: 'Entrevista',
  finalista: 'Finalista',
  seleccionado: 'Seleccionado',
  no_seleccionado: 'No Seleccionado',
  descartado: 'Descartado',
}

export const NIVELES_APROBACION = [
  { nivel: 1, nombre: 'Jefe Directo' },
  { nivel: 2, nombre: 'Gerencia del Área' },
  { nivel: 3, nombre: 'Dirección de Talento Humano' },
  { nivel: 4, nombre: 'Dirección General' },
]

export function formatoMoneda(valor: number | null | undefined) {
  if (valor == null) return '-'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor)
}

export function formatoFecha(valor: string | null | undefined) {
  if (!valor) return '-'
  // Una columna `date` pura (sin hora) llega como "YYYY-MM-DD". `new Date(...)` la interpreta
  // como medianoche UTC, y en un huso horario detrás de UTC (como Bogotá, -05:00) se muestra
  // un día antes. Se parsean los componentes directamente para evitar ese corrimiento.
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.exec(valor)
  if (soloFecha) {
    const [y, m, d] = valor.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  return new Date(valor).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'America/Bogota' })
}

export function formatoFechaHora(valor: string | null | undefined) {
  if (!valor) return '-'
  return new Date(valor).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' })
}

export function diasDesde(valor: string | null | undefined) {
  if (!valor) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(valor).getTime()) / 86400000))
}

// Colombia no tiene horario de verano: el offset -05:00 es fijo todo el año.
// Un <input type="datetime-local"> no lleva zona horaria; sin esto, Postgres
// lo interpreta como UTC y la hora queda corrida 5 horas.
export function bogotaISOString(valorDatetimeLocal: string) {
  return `${valorDatetimeLocal}:00-05:00`
}

// Inverso de bogotaISOString: para precargar un <input type="datetime-local">
// con la hora de Bogotá de un timestamp ya guardado (viene en UTC desde Postgres).
export function datetimeLocalDesdeISO(iso: string | null | undefined) {
  if (!iso) return ''
  const instante = new Date(iso)
  return new Date(instante.getTime() - 5 * 3600 * 1000).toISOString().slice(0, 16)
}
