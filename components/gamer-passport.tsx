'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Gamer Passport — XP/level + computed badges from get_gamer_passport() (migration 0112).
// The RPC returns badge keys + progress; the Georgian titles/icons live here.
interface Badge {
  key: string
  current: number
  target: number
  earned: boolean
}
interface Stats {
  visits: number
  venues: number
  tournaments: number
  checkins: number
  wins: number
  reviews: number
  spent: number
  xp: number
  level: number
  level_xp: number
  next_level_xp: number
}
interface Passport {
  stats: Stats
  badges: Badge[]
}

const CATALOG: Record<string, { title: string; desc: string; icon: string }> = {
  first_booking: { title: 'პირველი ნაბიჯი', desc: 'პირველი ჯავშანი', icon: '🎮' },
  regular: { title: 'რეგულარი', desc: '5 ვიზიტი', icon: '🕹️' },
  veteran: { title: 'ვეტერანი', desc: '25 ვიზიტი', icon: '🎯' },
  explorer: { title: 'მკვლევარი', desc: '3 სხვადასხვა კლუბი', icon: '🗺️' },
  fighter: { title: 'მებრძოლი', desc: 'პირველი ტურნირი', icon: '⚔️' },
  fighter_vet: { title: 'ვეტერან-მებრძოლი', desc: '5 ტურნირი', icon: '🛡️' },
  champion: { title: 'ჩემპიონი', desc: 'მოგებული ტურნირი', icon: '🏆' },
  legend: { title: 'ლეგენდა', desc: '3 ტურნირის მოგება', icon: '👑' },
  critic: { title: 'კრიტიკოსი', desc: 'დატოვებული შეფასება', icon: '✍️' },
  vip: { title: 'VIP', desc: '500₾ დახარჯული', icon: '💎' },
}

export function GamerPassport() {
  const [p, setP] = useState<Passport | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(supabase.rpc as unknown as (f: string) => Promise<{ data: Passport | null }>)(
      'get_gamer_passport',
    ).then(({ data }) => {
      setP(data && (data as Passport).stats ? data : null)
      setLoaded(true)
    })
  }, [])

  if (!loaded || !p) return null
  const s = p.stats
  const pct = Math.min(100, Math.round((s.level_xp / s.next_level_xp) * 100))
  const earnedCount = p.badges.filter((b) => b.earned).length

  return (
    <section className="nm-raised mb-8 rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">🪪 გეიმერ პასპორტი</h2>
        <span className="nm-inset rounded-full px-3 py-1 text-sm font-extrabold text-[var(--primary)]">
          LVL {s.level}
        </span>
      </div>

      {/* XP bar */}
      <div className="mb-1 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span>გამოცდილება</span>
        <span>
          {s.level_xp} / {s.next_level_xp} XP
        </span>
      </div>
      <div className="nm-inset mb-5 h-3 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: 'var(--primary)' }}
        />
      </div>

      {/* stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="🎮" value={s.visits} label="ვიზიტი" />
        <Stat icon="⚔️" value={s.tournaments} label="ტურნირი" />
        <Stat icon="🏆" value={s.wins} label="მოგება" />
        <Stat icon="💎" value={`${Math.round(s.spent)}₾`} label="დახარჯული" />
      </div>

      {/* badges */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">ბეჯები</h3>
        <span className="text-xs text-[var(--muted-foreground)]">
          {earnedCount} / {p.badges.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {p.badges.map((b) => {
          const meta = CATALOG[b.key] ?? { title: b.key, desc: '', icon: '🎖️' }
          return (
            <div
              key={b.key}
              title={meta.desc}
              className={`nm-inset flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center ${
                b.earned ? '' : 'opacity-40 grayscale'
              }`}
            >
              <span className="text-2xl">{meta.icon}</span>
              <span className="text-[11px] font-bold leading-tight">{meta.title}</span>
              {b.earned ? (
                <span className="text-[10px] font-bold text-[var(--primary)]">✓ მიღებული</span>
              ) : (
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  {Math.min(b.current, b.target)}/{b.target}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Stat({ icon, value, label }: { icon: string; value: number | string; label: string }) {
  return (
    <div className="nm-inset rounded-xl px-3 py-2.5 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-[11px] text-[var(--muted-foreground)]">{label}</div>
    </div>
  )
}
