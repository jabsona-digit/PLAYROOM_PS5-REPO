import Link from 'next/link'
import { Search, Trophy, Gamepad2, Calendar, MapPin, Ticket, Medal, ArrowRight } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/public'
import { VenueCard, type PublicVenue } from '@/components/venue-card'
import { TournamentCard, type PublicTournament } from '@/components/tournament-card'
import { ScrollReveal } from '@/components/scroll-reveal'

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
      {/* 1. Hero - Disabled ScrollReveal avoids LCP hydration flash */}
      <ScrollReveal disabled>
        <section className="relative py-14 text-center sm:py-20 overflow-visible">
          {/* ambient glow — PS-teal + violet gaming depth; drifts with scroll on the
              compositor (parallax-drift), never time-animated */}
          <div className="glow-orb parallax-drift" style={{ top: '-12%', left: '6%', width: 420, height: 420, background: 'color-mix(in oklch, var(--primary) 12%, transparent)' }} />
          <div className="glow-orb parallax-drift-slow" style={{ top: '18%', right: '2%', width: 360, height: 360, background: 'color-mix(in oklch, var(--violet) 10%, transparent)' }} />

          <h1 className="text-optical relative text-4xl font-extrabold sm:text-6xl">
            <span className="text-gradient-hero">იპოვე შენი შემდეგი</span>{' '}
            <span className="text-[var(--primary)] text-glow">ბრძოლა</span> 🎮
          </h1>
          <p className="relative mx-auto mt-5 max-w-2xl text-lg text-[var(--muted-foreground)]">
            საქართველოს საუკეთესო PlayStation ლაუნჯები, FC25 ტურნირები და გეიმერების საზოგადოება — ერთ ადგილას. იპოვე.
            დაჯავშნე. იბრძოლე.
          </p>

          {/* search → /venues?q= */}
          <form action="/venues" method="get" className="relative mx-auto mt-8 flex max-w-xl items-center gap-2">
            <div className="nm-inset flex flex-1 items-center gap-2 rounded-2xl px-4 py-3 transition-shadow duration-200 focus-within:shadow-[inset_4px_4px_9px_var(--nm-dark),inset_-4px_-4px_9px_var(--nm-light),0_0_0_1px_color-mix(in_oklch,var(--primary)_45%,transparent),0_0_20px_color-mix(in_oklch,var(--primary)_18%,transparent)]">
              <Search className="size-4 shrink-0 text-[var(--muted-foreground)]" />
              <input
                type="search"
                name="q"
                placeholder="ქალაქი ან კლუბი..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
              />
            </div>
            <button type="submit" className="btn-press nm-glow rounded-2xl px-6 py-3 text-sm font-bold">
              ძებნა
            </button>
          </form>

          <div className="relative mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/venues" className="btn-press nm-btn rounded-xl px-5 py-2.5 text-sm font-semibold">
              იპოვე კლუბი
            </Link>
            <Link href="/tournaments" className="btn-press nm-btn rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--primary)]">
              ნახე ტურნირები →
            </Link>
          </div>

          <p className="relative mt-6 text-xs text-[var(--muted-foreground)]">
            🟢 ცოცხალი ხელმისაწვდომობა · 🎮 აქტიური კლუბები · 🏆 მიმდინარე ტურნირები
          </p>
        </section>
      </ScrollReveal>

      {/* 2. Tournaments — violet is the tournament world's color */}
      <ScrollReveal delayMs={100}>
        <section className="pb-12">
          <div className="nm-raised relative overflow-hidden rounded-3xl p-7 sm:p-10">
            <div className="glow-orb" style={{ top: '-30%', right: '10%', width: 380, height: 380, background: 'color-mix(in oklch, var(--violet) 12%, transparent)' }} />
            <div className="relative flex flex-col items-center gap-3 text-center">
              <Trophy className="size-9 text-[var(--violet)] text-glow-violet" />
              <h2 className="text-2xl font-bold sm:text-3xl">შემოდი ბრძოლაში. 🏆</h2>
              <p className="max-w-2xl text-[var(--muted-foreground)]">
                FC25, Mortal Kombat და სხვა — მსოფლიო ჩემპიონატის ფორმატით. დარეგისტრირდი ონლაინ, მიიღე QR ბილეთი,
                მოხვდი ჯგუფში და იბრძოლე პრიზისთვის.
              </p>
              <Link href="/tournaments" className="btn-press nm-glow neon-border-violet rounded-xl px-6 py-3 mt-3 text-sm font-bold">
                ნახე აქტიური ტურნირები
              </Link>
            </div>

            {liveTours.length > 0 && (
              <div className="relative mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {liveTours.map((t, i) => (
                  <ScrollReveal key={t.id} delayMs={i * 80}>
                    <TournamentCard t={t} />
                  </ScrollReveal>
                ))}
              </div>
            )}
          </div>
        </section>
      </ScrollReveal>

      {/* 3. Passport & Rewards */}
      <ScrollReveal delayMs={150}>
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
                  <span className="nm-inset rounded-full px-3 py-1.5 hover:text-[var(--primary)] transition-colors">🎟️ ყველა QR ბილეთი</span>
                  <span className="nm-inset rounded-full px-3 py-1.5 hover:text-[var(--primary)] transition-colors">📜 ტურნირების ისტორია</span>
                  <span className="nm-inset rounded-full px-3 py-1.5 hover:text-[var(--primary)] transition-colors">🏅 ბეჯები</span>
                  <span className="nm-inset rounded-full px-3 py-1.5 hover:text-[var(--primary)] transition-colors">⬆️ XP & დონე</span>
                </div>
                <Link href="/account" className="btn-press nm-glow neon-border mt-6 inline-block rounded-xl px-6 py-3 text-sm font-bold">
                  ნახე შენი პასპორტი
                </Link>
              </div>
              <div className="hidden sm:flex">
                <Medal className="size-28 text-[var(--primary)] opacity-30" />
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* 4. Featured venues */}
      <ScrollReveal delayMs={200}>
        <section className="pb-12">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-2xl font-bold">გამორჩეული კლუბები</h2>
            <Link href="/venues" className="text-sm text-[var(--primary)] hover:underline hover:text-glow transition-all">
              ყველა →
            </Link>
          </div>
          {list.length === 0 ? (
            <div className="nm-inset rounded-2xl p-10 text-center text-[var(--muted-foreground)]">
              ჯერ გამოქვეყნებული კლუბი არ არის. მალე დაემატება! 🎮
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((v, i) => (
                <ScrollReveal key={v.id} delayMs={i * 70}>
                  <VenueCard venue={v} />
                </ScrollReveal>
              ))}
            </div>
          )}
        </section>
      </ScrollReveal>

      {/* 5. How it works */}
      <ScrollReveal delayMs={200}>
        <section className="pb-12">
          <h2 className="mb-6 text-center text-2xl font-bold">როგორ მუშაობს — 3 ნაბიჯში</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[
              { icon: Search, n: '1', t: 'იპოვე', d: 'აირჩიე ქალაქი და კლუბი, ნახე ცოცხალი ხელმისაწვდომობა.' },
              { icon: Calendar, n: '2', t: 'დაჯავშნე', d: 'აირჩიე კონსოლი და დრო, დაადასტურე წამებში.' },
              { icon: Gamepad2, n: '3', t: 'ითამაშე', d: 'მიდი კლუბში, აჩვენე QR და დაიწყე თამაში.' },
            ].map(({ icon: Icon, n, t, d }, i) => (
              <ScrollReveal key={n} delayMs={i * 80} className="nm-raised-sm hover-ring rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <span className="nm-inset flex size-9 items-center justify-center rounded-full text-sm font-extrabold text-[var(--primary)]">
                    {n}
                  </span>
                  <Icon className="size-5 text-[var(--primary)]" />
                </div>
                <h3 className="mt-3 font-bold">{t}</h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{d}</p>
              </ScrollReveal>
            ))}
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Ticket className="size-4 text-[var(--primary)]" />
            ტურნირისთვის: დარეგისტრირდი → QR → მოხვდი ჯგუფში → იბრძოლე.
          </p>
        </section>
      </ScrollReveal>

      {/* 6. Final CTA */}
      <ScrollReveal delayMs={250} animation="fade">
        <section className="pb-16">
          <div className="nm-raised rounded-3xl p-8 text-center sm:p-12 relative overflow-hidden">
            {/* Ambient background glow for final CTA */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[var(--primary)] opacity-5 blur-[120px] pointer-events-none"></div>
            
            <h2 className="text-2xl font-bold sm:text-3xl relative z-10">მზად ხარ შემდეგი ბრძოლისთვის?</h2>
            <p className="mx-auto mt-3 max-w-xl text-[var(--muted-foreground)] relative z-10">
              გეიმერები უკვე თამაშობენ Martelounge-ით. შენი ჯერია.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 relative z-10">
              <Link href="/venues" className="btn-press nm-glow neon-border rounded-xl px-6 py-3 text-sm font-bold">
                იპოვე კლუბი
              </Link>
              <Link
                href="/tournaments"
                className="btn-press nm-btn flex items-center gap-1.5 rounded-xl px-6 py-3 text-sm font-bold text-[var(--primary)]"
              >
                ნახე ტურნირები <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </ScrollReveal>
    </div>
  )
}
