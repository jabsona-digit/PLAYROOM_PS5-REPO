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
  venues: { name: string; city: string | null; total: number; busy: number; occupancy: number; venue_type?: string; categories?: string[] }[]
  generated_at?: string
}

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

// venue_type → label / icon / unit (mirrors admin ASSET_LABELS)
const VENUE_META: Record<string, { label: string; icon: string; unit: string }> = {
  playroom: { label: 'ფლეირუმი', icon: '🎮', unit: 'კონსოლი' },
  billiard: { label: 'ბილიარდი', icon: '🎱', unit: 'მაგიდა' },
  karaoke: { label: 'კარაოკე', icon: '🎤', unit: 'ოთახი' },
  vr: { label: 'VR', icon: '🥽', unit: 'სადგური' },
  mixed: { label: 'გაერთიანებული', icon: '🎯', unit: 'ადგილი' },
}
const meta = (t?: string) => VENUE_META[t || 'playroom'] ?? VENUE_META.playroom
// concrete activity categories a venue can appear under
const CATS = ['playroom', 'billiard', 'karaoke', 'vr'] as const
type V = PulseStats['venues'][number]
// A venue's REAL categories come from its console_type pools (get_pulse_stats).
// Fallback for older payloads: derive from venue_type (mixed → both common kinds).
const venueCats = (v: V): string[] => {
  if (v.categories && v.categories.length) return v.categories
  if (v.venue_type === 'mixed') return ['playroom', 'billiard']
  return [v.venue_type ?? 'playroom']
}

export function PulseLive({ initial }: { initial: PulseStats | null }) {
  const [s, setS] = useState<PulseStats | null>(initial)
  const [tab, setTab] = useState<string>('all')

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

  // category tabs — only shown when there's actually a choice (2+ activity types live)
  const cats = CATS.filter((c) => s.venues.some((v) => venueCats(v).includes(c)))
  const showTabs = cats.length > 1
  const shown = tab === 'all' ? s.venues : s.venues.filter((v) => venueCats(v).includes(tab))

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

        {/* Category tabs (🎮 ფლეირუმი / 🎱 ბილიარდი …) — 'mixed' venues appear in each */}
        {showTabs && (
          <div className="mb-5 flex flex-wrap gap-2">
            {(['all', ...cats] as string[]).map((c) => {
              const active = tab === c
              const m = c === 'all' ? null : meta(c)
              return (
                <button
                  key={c}
                  onClick={() => setTab(c)}
                  className="rounded-full border px-4 py-1.5 text-sm font-bold transition-colors"
                  style={
                    active
                      ? { borderColor: 'var(--primary)', background: 'color-mix(in oklch, var(--primary) 16%, transparent)', color: 'var(--primary)' }
                      : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }
                  }
                >
                  {m ? `${m.icon} ${m.label}` : '✨ ყველა'}
                </button>
              )
            })}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((v, i) => {
            const free = Math.max(0, v.total - v.busy)
            const hot = v.busy > 0
            const m = meta(v.venue_type)
            return (
              <div
                key={`${v.name}-${i}`}
                className="rounded-2xl border border-border bg-card/60 p-5"
                style={hot ? { boxShadow: `0 0 0 1px color-mix(in oklch, var(--primary) ${Math.min(60, v.occupancy)}%, transparent)` } : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-extrabold">{v.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="rounded-full bg-background/60 px-2 py-0.5 font-bold">{m.icon} {m.label}</span>
                      {v.city && <span>{v.city}</span>}
                    </p>
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
                  {v.busy} / {v.total} {m.unit} დაკავებული · {v.occupancy}%
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
