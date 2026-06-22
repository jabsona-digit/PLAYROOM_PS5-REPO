import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { VenueCard, type PublicVenue } from '@/components/venue-card'
import { Search } from 'lucide-react'
import { cn, VENUE_CATS, venueCategories, venueTypeMeta } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// Search-result URLs (?q=…) must NOT be indexed — they're crawl-amplification
// bait. The canonical listing is always /venues.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>
}): Promise<Metadata> {
  const { q, type } = await searchParams
  const term = (q ?? '').trim()
  const tMeta = type ? venueTypeMeta(type) : null
  return {
    title: term ? `ძებნა: ${term}` : tMeta ? `${tMeta.label} — კლუბები` : 'კლუბები',
    alternates: { canonical: '/venues' },
    robots: term ? { index: false, follow: true } : undefined,
  }
}

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>
}) {
  const { q, type } = await searchParams
  // strip characters that would break the PostgREST or() filter
  const term = (q ?? '').trim().replace(/[%,*()]/g, '').slice(0, 60)
  const activeType = (VENUE_CATS as readonly string[]).includes(type ?? '') ? (type as string) : ''

  const supabase = await createClient()
  let query = supabase.from('public_venues').select('*')
  if (term) query = query.or(`name.ilike.*${term}*,city.ilike.*${term}*`)
  const { data: venues } = await query.order('avg_rating', { ascending: false })

  const all = (venues ?? []) as PublicVenue[]
  // show a tab only for categories that actually have a venue (in the searched set)
  const presentCats = VENUE_CATS.filter((c) => all.some((v) => venueCategories(v.venue_type).includes(c)))
  // a 'mixed' venue matches each of its categories, so it shows under both tabs
  const list = activeType ? all.filter((v) => venueCategories(v.venue_type).includes(activeType)) : all

  // tab link, preserving the active search term
  const tabHref = (t?: string) => {
    const p = new URLSearchParams()
    if (term) p.set('q', term)
    if (t) p.set('type', t)
    const qs = p.toString()
    return qs ? `/venues?${qs}` : '/venues'
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">ყველა კლუბი</h1>

      {/* search — plain GET form, works server-side without JS */}
      <form method="get" className="mb-5 flex items-center gap-2">
        {activeType && <input type="hidden" name="type" value={activeType} />}
        <div className="nm-inset flex flex-1 items-center gap-2 rounded-2xl px-4 py-3">
          <Search className="size-4 shrink-0 text-[var(--muted-foreground)]" />
          <input
            type="search"
            name="q"
            defaultValue={term}
            placeholder="ძებნა კლუბის ან ქალაქის მიხედვით…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
          />
        </div>
        <button type="submit" className="nm-btn rounded-2xl px-5 py-3 text-sm font-bold text-[var(--primary)]">
          ძებნა
        </button>
      </form>

      {/* type filter — 🎮 ფლეირუმი / 🎱 ბილიარდი … (mixed venues appear under each) */}
      {presentCats.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href={tabHref()}
            className={cn('rounded-full px-4 py-2 text-sm font-bold', activeType ? 'nm-btn text-[var(--muted-foreground)]' : 'nm-glow text-[var(--primary)]')}
          >
            ✨ ყველა
          </Link>
          {presentCats.map((c) => {
            const m = venueTypeMeta(c)
            const on = activeType === c
            return (
              <Link
                key={c}
                href={tabHref(c)}
                className={cn('rounded-full px-4 py-2 text-sm font-bold', on ? 'nm-glow text-[var(--primary)]' : 'nm-btn text-[var(--muted-foreground)]')}
              >
                {m.icon} {m.label}
              </Link>
            )
          })}
        </div>
      )}

      {list.length === 0 ? (
        <div className="nm-inset rounded-2xl p-10 text-center text-[var(--muted-foreground)]">
          {term
            ? `«${term}» — კლუბი ვერ მოიძებნა.`
            : activeType
              ? `${venueTypeMeta(activeType).icon} ${venueTypeMeta(activeType).label} — კლუბი ჯერ არ არის.`
              : 'ჯერ გამოქვეყნებული კლუბი არ არის. 🎮'}
        </div>
      ) : (
        <>
          {(term || activeType) && (
            <p className="mb-4 text-sm text-[var(--muted-foreground)]">
              ნაპოვნია {list.length} კლუბი
              {term ? ` «${term}»-ზე` : ''}
              {activeType ? ` · ${venueTypeMeta(activeType).icon} ${venueTypeMeta(activeType).label}` : ''}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
