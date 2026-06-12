import { createClient } from '@/lib/supabase/server'
import { VenueCard, type PublicVenue } from '@/components/venue-card'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'კლუბები' }

export default async function VenuesPage() {
  const supabase = await createClient()
  const { data: venues } = await supabase
    .from('public_venues')
    .select('*')
    .order('avg_rating', { ascending: false })

  const list = (venues ?? []) as PublicVenue[]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">ყველა კლუბი</h1>

      {list.length === 0 ? (
        <div className="nm-inset rounded-2xl p-10 text-center text-[var(--muted-foreground)]">
          ჯერ გამოქვეყნებული კლუბი არ არის. 🎮
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((v) => (
            <VenueCard key={v.id} venue={v} />
          ))}
        </div>
      )}
    </div>
  )
}
