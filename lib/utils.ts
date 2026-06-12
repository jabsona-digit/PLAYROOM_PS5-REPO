import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Georgian lari formatter
export function gel(amount: number | null | undefined): string {
  const n = Number(amount ?? 0)
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)} ₾`
}
