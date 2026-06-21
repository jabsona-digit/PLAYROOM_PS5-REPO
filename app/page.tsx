import Link from 'next/link'
import { Search, Trophy, Gamepad2, Calendar, MapPin, Ticket, Medal, ArrowRight } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/public'
import { VenueCard, type PublicVenue } from '@/components/venue-card'
import { TournamentCard, type PublicTournament } from '@/components/tournament-card'

// ISR: cache the home for 30 min — public reads only (no cookies), CDN-served.
export const revalidate = 1800

export default async function Home() {
  const supabase = createPublicClient()
  const { data: venues } = await supabase
    .from('public_venues')
    .select('*')
    .order('avg_rating', { ascending: false })
    .limit(9)
  const list = (venues ?? []) as PublicVenue[]

  // public_tournaments is a view not in the generated types — read via a typed cast.
  const tReader = supabase as unknown as {
    from: (r: string) => {
      select: (c: string) => {
        order: (col: string, o: { ascending: boolean }) => Promise<{ data: PublicTournament[] | null }>
      }
    }
  }
  const { data: tours } = await tReader.from('public_tournaments').select('*').order('starts_at', { ascending: true })
  const liveTours = (tours ?? []).filter((t) => t.status === 'registration' || t.status === 'active').slice(0, 3)

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* 1. Hero */}
      <section className="py-14 text-center animate-in-up sm:py-20">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
          იპოვე შენი შემდეგი <span className="text-[var(--primary)] text-glow">ბრძოლა</span> 🎮
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--muted-foreground)]">
          საქართველოს საუკეთესო PlayStation ლაუნჯები, FC25 ტურნირები და გეიმერების საზოგადოება — ერთ ადგილას. იპოვე.
          დაჯავშნე. იბრძოლე.
        </p>

        {/* search → /venues?q= */}
        <form action="/venues" method="get" className="mx-auto mt-8 flex max-w-xl items-center gap-2">
          <div className="nm-inset flex flex-1 items-center gap-2 rounded-2xl px-4 py-3">
            <Search className="size-4 shrink-0 text-[var(--muted-foreground)]" />
            <input
              type="search"
              name="q"
              placeholder="ქალაქი ან კლუბი..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
            />
          </div>
          <button type="submit" className="nm-glow rounded-2xl px-5 py-3 text-sm font-bold">
            ძებნა
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link href="/venues" className="nm-btn rounded-xl px-5 py-2.5 text-sm font-semibold">
            იპოვე კლუბი
          </Link>
          <Link href="/tournaments" className="nm-btn rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--primary)]">
            ნახე ტურნირები →
          </Link>
        </div>

        <p className="mt-6 text-xs text-[var(--muted-foreground)]">
          🟢 ცოცხალი ხელმისაწვდომობა · 🎮 აქტიური კლუბები · 🏆 მიმდინარე ტურნირები
        </p>
      </section>

      {/* 2. Tournaments */}
      <section className="pb-12">
        <div className="nm-raised rounded-3xl p-7 sm:p-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <Trophy className="size-9 text-[var(--primary)]" />
            <h2 className="text-2xl font-bold sm:text-3xl">შემოდი ბრძოლაში. 🏆</h2>
            <p className="max-w-2xl text-[var(--muted-foreground)]">
              FC25, Mortal Kombat და სხვა — მსოფლიო ჩემპიონატის ფორმატით. დარეგისტრირდი ონლაინ, მიიღე QR ბილეთი,
              მოხვდი ჯგუფში და იბრძოლე პრიზისთვის.
            </p>
            <Link href="/tournaments" className="nm-glow mt-2 rounded-xl px-6 py-3 text-sm font-bold">
              ნახე აქტიური ტურნირები
            </Link>
          </div>

          {liveTours.length > 0 && (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {liveTours.map((t) => (
                <TournamentCard key={t.id} t={t} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. Passport & Rewards */}
      <section className="pb-12">
        <div className="nm-raised rounded-3xl p-7 sm:p-10">
          <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">🪪 შენი გეიმერ პასპორტი</h2>
              <p className="mt-3 max-w-xl text-[var(--muted-foreground)]">
                ყოველი ჯავშანი, ყოველი ტურნირი, ყოველი გამარჯვება — ერთ პროფილზე. დააგროვე XP, აიწიე დონეში და
                გახსენი ბეჯები.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className="nm-inset rounded-full px-3 py-1.5">🎟️ ყველა QR ბილეთი</span>
                <span className="nm-inset rounded-full px-3 py-1.5">📜 ტურნირების ისტორია</span>
                <span className="nm-inset rounded-full px-3 py-1.5">🏅 ბეჯები</span>
                <span className="nm-inset rounded-full px-3 py-1.5">⬆️ XP & დონე</span>
              </div>
              <Link href="/account" className="nm-glow mt-6 inline-block rounded-xl px-6 py-3 text-sm font-bold">
                ნახე შენი პასპორტი
              </Link>
            </div>
            <div className="hidden sm:flex">
              <Medal className="size-28 text-[var(--primary)] opacity-30" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Featured venues */}
      <section className="pb-12">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-bold">გამორჩეული კლუბები</h2>
          <Link href="/venues" className="text-sm text-[var(--primary)]">
            ყველა →
          </Link>
        </div>
        {list.length === 0 ? (
          <div className="nm-inset rounded-2xl p-10 text-center text-[var(--muted-foreground)]">
            ჯერ გამოქვეყნებული კლუბი არ არის. მალე დაემატება! 🎮
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        )}
      </section>

      {/* 5. How it works */}
      <section className="pb-12">
        <h2 className="mb-6 text-center text-2xl font-bold">როგორ მუშაობს — 3 ნაბიჯში</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            { icon: Search, n: '1', t: 'იპოვე', d: 'აირჩიე ქალაქი და კლუბი, ნახე ცოცხალი ხელმისაწვდომობა.' },
            { icon: Calendar, n: '2', t: 'დაჯავშნე', d: 'აირჩიე კონსოლი და დრო, დაადასტურე წამებში.' },
            { icon: Gamepad2, n: '3', t: 'ითამაშე', d: 'მიდი კლუბში, აჩვენე QR და დაიწყე თამაში.' },
          ].map(({ icon: Icon, n, t, d }) => (
            <div key={n} className="nm-raised-sm rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <span className="nm-inset flex size-9 items-center justify-center rounded-full text-sm font-extrabold text-[var(--primary)]">
                  {n}
                </span>
                <Icon className="size-5 text-[var(--primary)]" />
              </div>
              <h3 className="mt-3 font-bold">{t}</h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Ticket className="size-4 text-[var(--primary)]" />
          ტურნირისთვის: დარეგისტრირდი → QR → მოხვდი ჯგუფში → იბრძოლე.
        </p>
      </section>

      {/* 6. Final CTA */}
      <section className="pb-16">
        <div className="nm-raised rounded-3xl p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">მზად ხარ შემდეგი ბრძოლისთვის?</h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--muted-foreground)]">
            გეიმერები უკვე თამაშობენ Martelounge-ით. შენი ჯერია.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/venues" className="nm-glow rounded-xl px-6 py-3 text-sm font-bold">
              იპოვე კლუბი
            </Link>
            <Link
              href="/tournaments"
              className="nm-btn flex items-center gap-1.5 rounded-xl px-6 py-3 text-sm font-bold text-[var(--primary)]"
            >
              ნახე ტურნირები <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
