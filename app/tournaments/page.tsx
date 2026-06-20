import type { Metadata } from 'next'
import { Trophy } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/public'
import { TournamentCard, type PublicTournament } from '@/components/tournament-card'

// ISR — tournaments change slowly; cookie-less anon client keeps this CDN-cacheable.
export const revalidate = 60

export const metadata: Metadata = {
  title: 'ტურნირები — Martelounge',
  description:
    'PlayStation ტურნირები საქართველოს ლაუნჯებში — მსოფლიო ჩემპიონატის ფორმატი (ჯგუფები + ნოკაუტი), საპრიზო ფონდი. დარეგისტრირდი და ითამაშე.',
  alternates: { canonical: '/tournaments' },
}

// public_tournaments is a new anon view not yet in the generated Database types;
// read it through a minimal typed shape (no `any`) until types are regenerated.
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
      <div className="mb-2 flex items-center gap-3">
        <Trophy className="size-7 text-[var(--primary)]" />
        <h1 className="text-3xl font-bold">ტურნირები</h1>
      </div>
      <p className="mb-8 text-[var(--muted-foreground)]">
        მსოფლიო ჩემპიონატის ფორმატი — ჯგუფური ეტაპი + ნოკაუტი. დარეგისტრირდი, ითამაშე, მოიგე. 🏆
      </p>

      {list.length === 0 ? (
        <div className="nm-inset rounded-2xl p-10 text-center text-[var(--muted-foreground)]">
          ჯერ ტურნირები არ არის — მალე! 🏆
        </div>
      ) : (
        <div className="space-y-10">
          <Section title="🟢 ღია რეგისტრაცია" items={live} />
          <Section title="🔜 მალე" items={soon} />
          <Section title="🏁 დასრულებული" items={done} />
        </div>
      )}
    </div>
  )
}

function Section({ title, items }: { title: string; items: PublicTournament[] }) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <TournamentCard key={t.id} t={t} />
        ))}
      </div>
    </section>
  )
}
