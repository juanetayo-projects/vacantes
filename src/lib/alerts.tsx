import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { Boton } from '../components/ui'

type TipoAlerta = 'success' | 'error' | 'info' | 'warning'

type Alerta = { titulo?: string; mensaje: string; tipo: TipoAlerta }
type Confirmacion = {
  titulo?: string
  mensaje: string
  textoConfirmar?: string
  textoCancelar?: string
  variante?: 'peligro' | 'primario'
}

type AlertCtx = {
  notify: (mensaje: string, tipo?: TipoAlerta, titulo?: string) => void
  confirm: (mensaje: string, opts?: Omit<Confirmacion, 'mensaje'>) => Promise<boolean>
}

const Ctx = createContext<AlertCtx>({ notify: () => {}, confirm: async () => false })
export const useAlert = () => useContext(Ctx)

const ICONOS: Record<TipoAlerta, ReactNode> = {
  success: <CheckCircle2 className="text-emerald-500" size={22} />,
  error: <XCircle className="text-rose-600" size={22} />,
  warning: <AlertTriangle className="text-amber-500" size={22} />,
  info: <Info className="text-sky-500" size={22} />,
}

const TITULOS: Record<TipoAlerta, string> = {
  success: 'Listo',
  error: 'Ocurrió un error',
  warning: 'Atención',
  info: 'Información',
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerta, setAlerta] = useState<Alerta | null>(null)
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null)
  const resolverRef = useRef<(v: boolean) => void>(() => {})

  const notify = useCallback((mensaje: string, tipo: TipoAlerta = 'info', titulo?: string) => {
    setAlerta({ mensaje, tipo, titulo })
  }, [])

  const confirm = useCallback((mensaje: string, opts?: Omit<Confirmacion, 'mensaje'>) => {
    setConfirmacion({ mensaje, ...opts })
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  function cerrarConfirmacion(resultado: boolean) {
    setConfirmacion(null)
    resolverRef.current(resultado)
  }

  return (
    <Ctx.Provider value={{ notify, confirm }}>
      {children}

      {alerta && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-modal-overlay"
          onClick={() => setAlerta(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {ICONOS[alerta.tipo]}
                <h3 className="font-semibold text-slate-800">{alerta.titulo ?? TITULOS[alerta.tipo]}</h3>
              </div>
              <button onClick={() => setAlerta(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">{alerta.mensaje}</p>
            <div className="mt-4 flex justify-end">
              <Boton onClick={() => setAlerta(null)} className="!px-4 !py-1.5 text-sm">Cerrar</Boton>
            </div>
          </div>
        </div>
      )}

      {confirmacion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-modal-overlay"
          onClick={() => cerrarConfirmacion(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-slate-800">{confirmacion.titulo ?? 'Confirmar acción'}</h3>
              <button onClick={() => cerrarConfirmacion(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">{confirmacion.mensaje}</p>
            <div className="mt-4 flex justify-end gap-2">
              <Boton variante="secundario" onClick={() => cerrarConfirmacion(false)} className="!px-4 !py-1.5 text-sm">
                {confirmacion.textoCancelar ?? 'Cancelar'}
              </Boton>
              <Boton variante={confirmacion.variante ?? 'primario'} onClick={() => cerrarConfirmacion(true)} className="!px-4 !py-1.5 text-sm">
                {confirmacion.textoConfirmar ?? 'Confirmar'}
              </Boton>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
