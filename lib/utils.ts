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

// venue_type → label / icon (mirrors admin ASSET_LABELS + /live VENUE_META)
export const VENUE_TYPE_META: Record<string, { label: string; icon: string }> = {
  playroom: { label: 'ფლეირუმი', icon: '🎮' },
  billiard: { label: 'ბილიარდი', icon: '🎱' },
  karaoke: { label: 'კარაოკე', icon: '🎤' },
  vr: { label: 'VR', icon: '🥽' },
  mixed: { label: 'გაერთიანებული', icon: '🎯' },
}
export const venueTypeMeta = (t?: string | null) => VENUE_TYPE_META[t || 'playroom'] ?? VENUE_TYPE_META.playroom

// base activity categories for the /venues type filter (display order).
// A 'mixed' venue offers both playroom + billiard, so it appears under each
// (mirrors /live's venueCats fallback when categories[] aren't available).
export const VENUE_CATS = ['playroom', 'billiard', 'karaoke', 'vr'] as const
export const venueCategories = (venueType?: string | null): string[] =>
  venueType === 'mixed' ? ['playroom', 'billiard'] : [venueType ?? 'playroom']
