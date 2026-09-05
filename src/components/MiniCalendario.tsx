import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type EventoCalendario = { fecha: string; label: string; sub?: string }

const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function claveDia(d: Date) {
  return d.toISOString().slice(0, 10)
}

/** Calendario mensual compacto: muestra un punto en los días con eventos y el detalle del día seleccionado debajo. */
export function MiniCalendario({ eventos }: { eventos: EventoCalendario[] }) {
  const [cursor, setCursor] = useState(() => new Date())
  const [seleccionado, setSeleccionado] = useState(() => claveDia(new Date()))

  const anio = cursor.getFullYear()
  const mes = cursor.getMonth()
  const primerDiaSemana = new Date(anio, mes, 1).getDay()
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const hoy = claveDia(new Date())

  const eventosPorDia = new Map<string, EventoCalendario[]>()
  for (const ev of eventos) {
    const k = ev.fecha.slice(0, 10)
    eventosPorDia.set(k, [...(eventosPorDia.get(k) ?? []), ev])
  }

  const celdas: (number | null)[] = [
    ...Array(primerDiaSemana).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ]

  const eventosDelDia = eventosPorDia.get(seleccionado) ?? []

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => setCursor(new Date(anio, mes - 1, 1))} className="rounded p-1 text-slate-400 hover:bg-slate-100">
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-semibold text-slate-600">{MESES[mes]} {anio}</span>
        <button onClick={() => setCursor(new Date(anio, mes + 1, 1))} className="rounded p-1 text-slate-400 hover:bg-slate-100">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400">
        {DIAS.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celdas.map((dia, i) => {
          if (!dia) return <div key={i} />
          const fecha = new Date(anio, mes, dia)
          const clave = claveDia(fecha)
          const tieneEventos = eventosPorDia.has(clave)
          const esHoy = clave === hoy
          const esSeleccionado = clave === seleccionado
          return (
            <button key={i} onClick={() => setSeleccionado(clave)}
              className={`relative flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors
                ${esSeleccionado ? 'bg-brand text-white font-semibold' : esHoy ? 'bg-brand-50 text-brand font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
              {dia}
              {tieneEventos && !esSeleccionado && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-turquesa" />}
            </button>
          )
        })}
      </div>

      <div className="mt-3 max-h-28 overflow-y-auto border-t border-slate-200 pt-2">
        {eventosDelDia.length ? (
          <ul className="flex flex-col gap-1.5">
            {eventosDelDia.map((ev, i) => (
              <li key={i} className="rounded-lg bg-brand-50/60 px-2 py-1.5 text-xs">
                <p className="font-medium text-slate-700">{ev.label}</p>
                {ev.sub && <p className="text-[11px] text-slate-500">{ev.sub}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-center text-xs text-slate-400">Sin eventos este día</p>
        )}
      </div>
    </div>
  )
}
