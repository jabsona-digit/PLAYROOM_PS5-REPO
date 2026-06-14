import { createClient } from '@/lib/supabase/server'
import { VenueCard, type PublicVenue } from '@/components/venue-card'
import { Search } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'კლუბები' }

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  // strip characters that would break the PostgREST or() filter
  const term = (q ?? '').trim().replace(/[%,*()]/g, '').slice(0, 60)

  const supabase = await createClient()
  let query = supabase.from('public_venues').select('*')
  if (term) query = query.or(`name.ilike.*${term}*,city.ilike.*${term}*`)
  const { data: venues } = await query.order('avg_rating', { ascending: false })

  const list = (venues ?? []) as PublicVenue[]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">ყველა კლუბი</h1>

      {/* search — plain GET form, works server-side without JS */}
      <form method="get" className="mb-8 flex items-center gap-2">
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

      {list.length === 0 ? (
        <div className="nm-inset rounded-2xl p-10 text-center text-[var(--muted-foreground)]">
          {term ? `«${term}» — კლუბი ვერ მოიძებნა.` : 'ჯერ გამოქვეყნებული კლუბი არ არის. 🎮'}
        </div>
      ) : (
        <>
          {term && (
            <p className="mb-4 text-sm text-[var(--muted-foreground)]">
              ნაპოვნია {list.length} კლუბი «{term}»-ზე
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
