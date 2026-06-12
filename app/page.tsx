import Link from 'next/link'
import { Gamepad2, Clock, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { VenueCard, type PublicVenue } from '@/components/venue-card'

// Always render fresh listings (availability/ratings change often).
export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const { data: venues } = await supabase
    .from('public_venues')
    .select('*')
    .order('avg_rating', { ascending: false })
    .limit(12)

  const list = (venues ?? []) as PublicVenue[]

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="py-14 sm:py-20 text-center animate-in-up">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          ითამაშე <span className="text-[var(--primary)] text-glow">PlayStation</span>
          <br className="hidden sm:block" /> შენს ქალაქში
        </h1>
        <p className="mt-5 max-w-xl mx-auto text-[var(--muted-foreground)] text-lg">
          იპოვე ახლომდებარე კლუბი, ნახე ცოცხალი ხელმისაწვდომობა და დაჯავშნე
          კონსოლი წამებში.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/venues"
            className="nm-glow rounded-xl px-6 py-3 font-semibold"
          >
            ნახე კლუბები
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { icon: Gamepad2, t: 'PS5 კონსოლები', d: 'ახალი თამაშები, საუკეთესო კლუბები' },
            { icon: Clock, t: 'ცოცხალი ჯავშანი', d: 'ნახე რომელი კონსოლია თავისუფალი' },
            { icon: ShieldCheck, t: 'მარტივი გადახდა', d: 'გადარიცხვა ან ბარათით' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="nm-raised-sm rounded-2xl p-5 text-left">
              <Icon className="size-6 text-[var(--primary)]" />
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Listings */}
      <section className="pb-8">
        <div className="flex items-end justify-between mb-5">
          <h2 className="text-2xl font-bold">პოპულარული კლუბები</h2>
          <Link href="/venues" className="text-sm text-[var(--primary)]">
            ყველა →
          </Link>
        </div>

        {list.length === 0 ? (
          <div className="nm-inset rounded-2xl p-10 text-center text-[var(--muted-foreground)]">
            ჯერ გამოქვეყნებული კლუბი არ არის. მალე დაემატება! 🎮
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
