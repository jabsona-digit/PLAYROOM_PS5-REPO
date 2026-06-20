import Link from 'next/link'
import { Trophy, Calendar, MapPin, Users, Gamepad2 } from 'lucide-react'
import { TournamentRegister } from './tournament-register'

export interface PublicTournament {
  id: string
  name: string
  game: string | null
  format: string
  status: string
  entry_fee: number | null
  prize_pool: number | null
  starts_at: string | null
  group_size: number | null
  advance_per_group: number | null
  max_participants: number | null
  participant_count: number | null
  venue_slug: string | null
  venue_name: string | null
  venue_city: string | null
  venue_cover: string | null
  venue_type: string | null
}

const STATUS: Record<string, { label: string; muted: boolean }> = {
  registration: { label: '🟢 რეგისტრაცია ღია', muted: false },
  active: { label: '🔴 მიმდინარეობს', muted: false },
  seeking_host: { label: '🔜 მალე', muted: true },
  completed: { label: '🏁 დასრულდა', muted: true },
}

function fmtDate(s: string | null) {
  if (!s) return null
  return new Date(s).toLocaleString('ka-GE', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TournamentCard({ t }: { t: PublicTournament }) {
  const st = STATUS[t.status] ?? STATUS.registration
  const date = fmtDate(t.starts_at)

  const inner = (
    <div className="nm-raised flex h-full flex-col overflow-hidden rounded-2xl transition-transform hover:-translate-y-0.5">
      {t.venue_cover ? (
        <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${t.venue_cover})` }} />
      ) : (
        <div className="flex h-32 items-center justify-center bg-[var(--card)]">
          <Trophy className="size-10 text-[var(--primary)] opacity-40" />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold leading-tight">{t.name}</h3>
          <span
            className={`shrink-0 text-xs font-bold ${st.muted ? 'text-[var(--muted-foreground)]' : 'text-[var(--primary)]'}`}
          >
            {st.label}
          </span>
        </div>

        {t.game && (
          <p className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
            <Gamepad2 className="size-4" />
            {t.game}
          </p>
        )}

        {Number(t.prize_pool) > 0 && (
          <div className="nm-inset rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-[var(--muted-foreground)]">საპრიზო ფონდი</p>
            <p className="text-2xl font-extrabold text-[var(--primary)]">{t.prize_pool}₾</p>
          </div>
        )}

        <div className="mt-auto space-y-1.5 text-sm">
          {date && (
            <p className="flex items-center gap-2">
              <Calendar className="size-4 text-[var(--muted-foreground)]" />
              {date}
            </p>
          )}
          {t.venue_name ? (
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-[var(--muted-foreground)]" />
              {t.venue_name}
              {t.venue_city && `, ${t.venue_city}`}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-[var(--muted-foreground)]">
              <MapPin className="size-4" />
              ვენიუ მალე გამოცხადდება
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
              <Users className="size-4" />
              {t.participant_count ?? 0}
              {t.max_participants ? `/${t.max_participants}` : ''} მონაწილე
            </span>
            {Number(t.entry_fee) > 0 && <span className="text-xs font-bold">საწევრო {t.entry_fee}₾</span>}
          </div>
        </div>
      </div>
    </div>
  )

  const card = t.venue_slug ? (
    <Link href={`/${t.venue_slug}`} className="block">
      {inner}
    </Link>
  ) : (
    inner
  )

  return (
    <div className="flex h-full flex-col gap-2">
      {card}
      {t.status === 'registration' && <TournamentRegister tournamentId={t.id} entryFee={t.entry_fee} />}
    </div>
  )
}
