import Link from 'next/link'
import { Trophy, Calendar, MapPin, Users, Gamepad2 } from 'lucide-react'
import { TournamentRegister } from './tournament-register'
import { cn } from '@/lib/utils'

export interface PublicTournament {
  id: string
  name: string
  game: string | null
  format: string
  status: string
  entry_fee: number | null
  prize_pool: number | null
  prize_second: number | null
  prize_third_minutes: number | null
  min_participants: number | null
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
  
  const isActive = t.status === 'registration' || t.status === 'active'

  const inner = (
    <div className={cn(
      "nm-raised flex h-full flex-col overflow-hidden rounded-2xl transition-transform duration-300 hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-[0_15px_30px_color-mix(in_oklch,var(--nm-dark)_80%,transparent)] group relative",
      isActive && "neon-border"
    )}>
      {/* Esports gradient shape abstract for active cards */}
      {isActive && <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-transparent to-[var(--primary)]/5 opacity-50 pointer-events-none z-0" />}

      <div className="relative z-10 flex flex-col h-full">
        {t.venue_cover ? (
          <div className="h-32 bg-cover bg-center transition-transform duration-[2s] ease-out group-hover:scale-105" style={{ backgroundImage: `url(${t.venue_cover})` }} />
        ) : (
          <div className="flex h-32 items-center justify-center bg-[var(--card)] relative overflow-hidden group-hover:bg-[var(--surface)] transition-colors">
            <Trophy className="size-10 text-[var(--primary)] opacity-40 transition-transform group-hover:scale-110 duration-500" />
          </div>
        )}

        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold leading-tight group-hover:text-glow transition-all">{t.name}</h3>
            <span
              className={cn(
                "shrink-0 text-xs font-bold whitespace-nowrap flex items-center gap-1.5",
                st.muted ? "text-[var(--muted-foreground)]" : "text-[var(--primary)] text-glow"
              )}
            >
              {isActive && <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--primary)] opacity-70" /><span className="relative inline-flex size-full rounded-full bg-[var(--primary)]" /></span>}
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
            <div className={cn("nm-inset rounded-xl px-4 py-3 text-center mt-1", isActive && "border-[0.5px] border-[var(--primary)]/20")}>
              <p className="text-xs text-[var(--muted-foreground)]">საპრიზო ფონდი</p>
              <p className="text-2xl font-extrabold text-[var(--primary)] text-glow">{t.prize_pool}₾</p>
              {(Number(t.prize_second) > 0 || Number(t.prize_third_minutes) > 0) && (
                <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
                  <span className="font-medium text-[var(--foreground)]">🥇 {t.prize_pool}₾</span>
                  {Number(t.prize_second) > 0 && <span>· 🥈 {t.prize_second}₾</span>}
                  {Number(t.prize_third_minutes) > 0 && <span>· 🥉 {t.prize_third_minutes}წთ</span>}
                </div>
              )}
            </div>
          )}

          <div className="mt-auto space-y-2 text-sm pt-2">
            {date && (
              <p className="flex items-center gap-2 font-medium">
                <Calendar className="size-4 text-[var(--muted-foreground)]" />
                {date}
              </p>
            )}
            {t.venue_name ? (
              <p className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <MapPin className="size-4" />
                {t.venue_name}
                {t.venue_city && <span className="opacity-70">, {t.venue_city}</span>}
              </p>
            ) : (
              <p className="flex items-center gap-2 text-[var(--muted-foreground)] opacity-70">
                <MapPin className="size-4" />
                ვენიუ მალე გამოცხადდება
              </p>
            )}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border)]">
              <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <Users className="size-4" />
                {t.participant_count ?? 0}
                {t.max_participants ? <span className="opacity-60">/{t.max_participants}</span> : ''} <span className="hidden sm:inline">მონაწილე</span>
              </span>
              {Number(t.entry_fee) > 0 && <span className="text-xs font-bold nm-inset px-2.5 py-1 rounded-md">საწევრო {t.entry_fee}₾</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const card = t.venue_slug ? (
    <Link href={`/tournaments/${t.id}`} className="block h-full outline-none"> {/* Link to tournament detail instead of venue slug if needed, but it currently uses venue_slug because maybe tournaments don't have details? I leave the structure the same */}
      {inner}
    </Link>
  ) : (
    inner
  )

  // Fix: maintain existing routing
  const cardWithOldRouting = t.venue_slug ? (
     <Link href={`/${t.venue_slug}`} className="block h-full outline-none">
       {inner}
     </Link>
  ) : ( inner )

  return (
    <div className="flex h-full flex-col gap-3">
      {cardWithOldRouting}
      {t.status === 'registration' && <TournamentRegister tournamentId={t.id} entryFee={t.entry_fee} />}
    </div>
  )
}
