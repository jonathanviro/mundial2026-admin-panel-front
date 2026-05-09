import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date?: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatDateShort(date?: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function timeAgo(date?: string | null) {
  if (!date) return 'Nunca'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Hace un momento'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  return `Hace ${Math.floor(hrs / 24)}d`
}

export const PHASE_NAMES: Record<number, string> = {
  1: 'Fase de Grupos',
  2: 'Dieciseisavos de Final',
  3: 'Octavos de Final',
  4: 'Cuartos de Final',
  5: 'Semifinales',
  6: 'Final',
}
