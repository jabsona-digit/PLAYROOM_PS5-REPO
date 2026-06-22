import Link from 'next/link'
import { Star, MapPin } from 'lucide-react'
import { gel, venueTypeMeta } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

// the live public_venues view exposes venue_type (migration 0071); the generated
// types copy in this repo is behind, so add it here until types are re-synced.
export type PublicVenue = Database['public']['Views']['public_venues']['Row'] & {
  venue_type?: string | null
}

export function VenueCard({ venue }: { venue: PublicVenue }) {
  const tm = venueTypeMeta(venue.venue_type)
  return (
    <Link
      href={`/${venue.slug}`}
      className="nm-btn group block rounded-2xl overflow-hidden"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--surface)]">
        {venue.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={venue.cover_image_url}
            alt={venue.name ?? ''}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-5xl opacity-30">
            🎮
          </div>
        )}
        <div className="absolute top-3 left-3 nm-raised-sm rounded-full px-2.5 py-1 text-xs font-semibold">
          {tm.icon} {tm.label}
        </div>
        {Number(venue.avg_rating) > 0 && (
          <div className="absolute top-3 right-3 nm-raised-sm rounded-full px-2.5 py-1 flex items-center gap-1 text-xs font-semibold">
            <Star className="size-3.5 fill-[var(--primary)] text-[var(--primary)]" />
            {Number(venue.avg_rating).toFixed(1)}
            <span className="text-[var(--muted-foreground)] font-normal">
              ({venue.review_count})
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg leading-tight">{venue.name}</h3>
        {(venue.city || venue.address) && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
            <MapPin className="size-3.5 shrink-0" />
            {[venue.city, venue.address].filter(Boolean).join(', ')}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          {venue.price_from != null ? (
            <span className="text-sm">
              <span className="text-[var(--muted-foreground)]">დან </span>
              <span className="font-semibold text-[var(--primary)]">
                {gel(venue.price_from)}
              </span>
              <span className="text-[var(--muted-foreground)]"> / სთ</span>
            </span>
          ) : (
            <span />
          )}
          <span className="text-sm font-medium text-[var(--primary)] group-hover:translate-x-0.5 transition-transform">
            დაჯავშნა →
          </span>
        </div>
      </div>
    </Link>
  )
}
