import type { Metadata } from 'next'
import { Trophy } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/public'
import { TournamentCard, type PublicTournament } from '@/components/tournament-card'
import { ScrollReveal } from '@/components/scroll-reveal'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'ტურნირები — Martelounge',
  description:
    'PlayStation ტურნირები საქართველოს ლაუნჯებში — მსოფლიო ჩემპიონატის ფორმატი (ჯგუფები + ნოკაუტი), საპრიზო ფონდი. დარეგისტრირდი და ითამაშე.',
  alternates: { canonical: '/tournaments' },
}

type TournamentReader = {
  from: (rel: string) => {
    select: (cols: string) => {
      order: (col: string, opts: { ascending: boolean }) => Promise<{ data: PublicTournament[] | null }>
    }
  }
}

export default async function TournamentsPage() {
  const supabase = createPublicClient() as unknown as TournamentReader
  const { data } = await supabase
    .from('public_tournaments')
    .select('*')
    .order('starts_at', { ascending: true })
  const list = data ?? []

  const live = list.filter((t) => t.status === 'registration' || t.status === 'active')
  const soon = list.filter((t) => t.status === 'seeking_host')
  const done = list.filter((t) => t.status === 'completed')

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ScrollReveal disabled>
        <div className="mb-2 flex items-center gap-3">
          <Trophy className="size-7 text-[var(--primary)] text-glow" />
          <h1 className="text-3xl font-bold text-glow">ტურნირები</h1>
        </div>
        <p className="mb-8 text-[var(--muted-foreground)]">
          მსოფლიო ჩემპიონატის ფორმატი — ჯგუფური ეტაპი + ნოკაუტი. დარეგისტრირდი, ითამაშე, მოიგე. 🏆
        </p>
      </ScrollReveal>

      {list.length === 0 ? (
        <ScrollReveal disabled>
          <div className="nm-inset rounded-2xl p-10 text-center text-[var(--muted-foreground)]">
            ჯერ ტურნირები არ არის — მალე! 🏆
          </div>
        </ScrollReveal>
      ) : (
        <div className="space-y-10">
          <Section title="🟢 მიმდინარე" items={live} delayOffset={0} />
          <Section title="🔜 მალე" items={soon} delayOffset={live.length > 0 ? 200 : 0} />
          <Section title="🏁 დასრულებული" items={done} delayOffset={(live.length + soon.length) > 0 ? 300 : 0} />
        </div>
      )}
    </div>
  )
}

function Section({ title, items, delayOffset }: { title: string; items: PublicTournament[]; delayOffset: number }) {
  if (items.length === 0) return null
  return (
    <section>
      <ScrollReveal disabled>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
          {title}
        </h2>
      </ScrollReveal>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t, i) => (
          <ScrollReveal key={t.id} delayMs={delayOffset + (i * 100)}>
            <div className="h-full group">
              <TournamentCard t={t} />
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
