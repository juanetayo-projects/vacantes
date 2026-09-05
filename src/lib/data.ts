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
  return new Date(valor).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function diasDesde(valor: string | null | undefined) {
  if (!valor) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(valor).getTime()) / 86400000))
}
