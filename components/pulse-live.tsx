'use client'

import { useEffect, useState } from 'react'
import { Activity, Flame, Clock, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface PulseStats {
  players_now: number
  venues_live: number
  venues_total: number
  sessions_month: number
  hours_month: number
  cities: { city: string; players: number; occupancy: number }[]
  venues: { name: string; city: string | null; total: number; busy: number; occupancy: number }[]
  generated_at?: string
}

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

export function PulseLive({ initial }: { initial: PulseStats | null }) {
  const [s, setS] = useState<PulseStats | null>(initial)

  // Live: re-fetch every 15s (and on tab refocus). Aggregated, public, cheap.
  useEffect(() => {
    const sb = createClient()
    let alive = true
    const tick = async () => {
      const { data } = await (sb.rpc as unknown as (f: string) => Promise<{ data: PulseStats | null }>)('get_pulse_stats')
      if (alive && data) setS(data)
    }
    const iv = setInterval(tick, 15000)
    const onVis = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; clearInterval(iv); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  if (!s) {
    return <div className="py-32 text-center text-muted-foreground">იტვირთება…</div>
  }

  return (
    <div className="space-y-8 animate-in-up">
      {/* Hero */}
      <section className="rounded-3xl border border-border bg-card/60 p-8 text-center sm:p-12">
        <p className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-primary">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          Martelounge Pulse
        </p>
        <p className="mt-6 font-mono text-6xl font-black tabular-nums text-primary text-glow sm:text-8xl">
          {fmt(s.players_now)}
        </p>
        <p className="mt-2 text-lg font-bold sm:text-2xl">მოთამაშე ახლა თამაშობს 🎮</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {fmt(s.venues_live)} / {fmt(s.venues_total)} ლაუნჯში საქართველოში
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-4 py-2 font-bold">
            <Activity className="size-4 text-primary" /> {fmt(s.sessions_month)} სესია ამ თვეში
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-4 py-2 font-bold">
            <Clock className="size-4 text-primary" /> {fmt(s.hours_month)} საათი ნათამაშები
          </span>
        </div>
      </section>

      {/* Cities */}
      {s.cities.filter((c) => c.city !== '—').length > 0 && (
        <section className="rounded-3xl border border-border bg-card/60 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
            <MapPin className="size-4 text-primary" /> ქალაქების მიხედვით
          </h2>
          <div className="space-y-3">
            {s.cities.filter((c) => c.city !== '—').map((c) => (
              <div key={c.city} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm font-bold">{c.city}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-background/60">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-700"
                    style={{ width: `${Math.max(3, c.occupancy)}%`, boxShadow: '0 0 12px var(--primary)' }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-sm font-bold tabular-nums text-muted-foreground">
                  {c.occupancy}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Venues */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
          <Flame className="size-4 text-primary" /> ლაუნჯები ახლა
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {s.venues.map((v, i) => {
            const free = Math.max(0, v.total - v.busy)
            const hot = v.busy > 0
            return (
              <div
                key={`${v.name}-${i}`}
                className="rounded-2xl border border-border bg-card/60 p-5"
                style={hot ? { boxShadow: `0 0 0 1px color-mix(in oklch, var(--primary) ${Math.min(60, v.occupancy)}%, transparent)` } : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-extrabold">{v.name}</p>
                    {v.city && <p className="text-xs text-muted-foreground">{v.city}</p>}
                  </div>
                  <span
                    className="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
                    style={{
                      background: `color-mix(in oklch, ${hot ? 'var(--primary)' : 'var(--muted-foreground)'} 16%, transparent)`,
                      color: hot ? 'var(--primary)' : 'var(--muted-foreground)',
                    }}
                  >
                    {free > 0 ? `🟢 ${free} თავისუფალი` : 'სავსე'}
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/60">
                  <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${v.occupancy}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {v.busy} / {v.total} კონსოლი დაკავებული · {v.occupancy}%
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <p className="pb-6 text-center text-xs text-muted-foreground/70">
        🔴 ცოცხალი — ახლდება ყოველ 15 წამში
      </p>
    </div>
  )
}
