import { supabase } from './supabase'

export async function crearNotificacion(
  usuarioId: string,
  titulo: string,
  mensaje?: string,
  opts?: { tipo?: string; referenciaTabla?: string; referenciaId?: number },
) {
  await supabase.from('notificaciones').insert({
    usuario_id: usuarioId,
    titulo,
    mensaje: mensaje ?? null,
    tipo: opts?.tipo ?? null,
    referencia_tabla: opts?.referenciaTabla ?? null,
    referencia_id: opts?.referenciaId ?? null,
  })
}
