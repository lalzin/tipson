import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/** Formate un montant en centimes vers "1€", "1,50€", "2,75€" etc. */
export function formatPrice(cents: number): string {
  if (cents === 0) return 'Gratuit'
  const eur = cents / 100
  return eur % 1 === 0 ? `${eur}€` : `${eur.toFixed(2).replace('.', ',')}€`
}

export function formatDuration(ms: number): string {
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${min}:${sec.toString().padStart(2, '0')}`
}
