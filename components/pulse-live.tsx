'use client'

import { useEffect, useState } from 'react'
import { Activity, Flame, Clock, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ScrollReveal } from '@/components/scroll-reveal'
import { cn } from '@/lib/utils'

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

// venue_type → label / icon / unit
const VENUE_META: Record<string, { label: string; icon: string; unit: string }> = {
  playroom: { label: 'ფლეირუმი', icon: '🎮', unit: 'კონსოლი' },
  billiard: { label: 'ბილიარდი', icon: '🎱', unit: 'მაგიდა' },
  karaoke: { label: 'კარაოკე', icon: '🎤', unit: 'ოთახი' },
  vr: { label: 'VR', icon: '🥽', unit: 'სადგური' },
  mixed: { label: 'გაერთიანებული', icon: '🎯', unit: 'ადგილი' },
}
const meta = (t?: string) => VENUE_META[t || 'playroom'] ?? VENUE_META.playroom
const CATS = ['playroom', 'billiard', 'karaoke', 'vr'] as const
type V = PulseStats['venues'][number]

const venueCats = (v: V): string[] => {
  if (v.categories && v.categories.length) return v.categories
  if (v.venue_type === 'mixed') return ['playroom', 'billiard']
  return [v.venue_type ?? 'playroom']
}

export function PulseLive({ initial }: { initial: PulseStats | null }) {
  const [s, setS] = useState<PulseStats | null>(initial)
  const [tab, setTab] = useState<string>('all')

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
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-4">
        {/* Glowing Neon Loader */}
        <div className="size-10 rounded-full neon-border shadow-[0_0_15px_var(--primary)] animate-pulse" />
        <p className="text-sm font-bold text-glow text-[var(--primary)]">იტვირთება...</p>
      </div>
    )
  }

  const cats = CATS.filter((c) => s.venues.some((v) => venueCats(v).includes(c)))
  const showTabs = cats.length > 1
  const shown = tab === 'all' ? s.venues : s.venues.filter((v) => venueCats(v).includes(tab))

  return (
    <div className="space-y-8 pb-10">
      {/* Hero */}
      <ScrollReveal disabled>
        <section className="rounded-3xl nm-raised p-8 text-center sm:p-12 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[var(--primary)] opacity-5 blur-[120px] pointer-events-none" />
          
          <div className="relative z-10 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-[var(--primary)]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--primary)] opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--primary)]" />
            </span>
            Martelounge Pulse
          </div>
          <p className="relative z-10 mt-6 font-mono text-6xl font-black tabular-nums text-[var(--primary)] text-glow sm:text-8xl">
            {fmt(s.players_now)}
          </p>
          <p className="relative z-10 mt-3 text-lg font-bold sm:text-2xl text-shadow-sm">მოთამაშე ახლა თამაშობს 🎮</p>
          <p className="relative z-10 mt-1 text-sm text-[var(--muted-foreground)] font-medium">
            {fmt(s.venues_live)} / {fmt(s.venues_total)} ლაუნჯში საქართველოში
          </p>

          <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
            <span className="nm-inset flex items-center gap-2 rounded-full px-5 py-2.5 font-bold hover:text-[var(--primary)] transition-colors">
              <Activity className="size-4 text-[var(--primary)]" /> {fmt(s.sessions_month)} სესია ამ თვეში
            </span>
            <span className="nm-inset flex items-center gap-2 rounded-full px-5 py-2.5 font-bold hover:text-[var(--primary)] transition-colors">
              <Clock className="size-4 text-[var(--primary)]" /> {fmt(s.hours_month)} საათი ნათამაშები
            </span>
          </div>
        </section>
      </ScrollReveal>

      {/* Cities */}
      {s.cities.filter((c) => c.city !== '—').length > 0 && (
        <ScrollReveal delayMs={100}>
          <section className="rounded-3xl nm-inset p-6">
            <h2 className="mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--muted-foreground)]">
              <MapPin className="size-4 text-[var(--primary)]" /> ქალაქების მიხედვით
            </h2>
            <div className="space-y-4">
              {s.cities.filter((c) => c.city !== '—').map((c) => (
                <div key={c.city} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm font-bold">{c.city}</span>
                  <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-[var(--background)]/60">
                    <div
                      className="h-full rounded-full bg-[var(--primary)] shadow-[0_0_12px_var(--primary)] transition-[width] duration-1000 ease-out"
                      style={{ width: `${Math.max(3, c.occupancy)}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-mono text-sm font-bold tabular-nums text-[var(--primary)]">
                    {c.occupancy}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* Venues */}
      <section>
        <ScrollReveal disabled>
          <div className="mb-5 flex items-end justify-between flex-wrap gap-4">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--muted-foreground)]">
              <Flame className="size-4 text-[var(--primary)]" /> ლაუნჯები ახლა
            </h2>

            {/* Category tabs */}
            {showTabs && (
              <div className="flex flex-wrap gap-2">
                {(['all', ...cats] as string[]).map((c) => {
                  const active = tab === c
                  const m = c === 'all' ? null : meta(c)
                  return (
                    <button
                      key={c}
                      onClick={() => setTab(c)}
                      className={cn(
                        'rounded-full px-4 py-1.5 text-sm font-bold transition-all',
                        active ? 'nm-glow neon-border text-[var(--primary)] hover:-translate-y-0.5' : 'nm-btn text-[var(--muted-foreground)] hover:text-white'
                      )}
                    >
                      {m ? `${m.icon} ${m.label}` : '✨ ყველა'}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollReveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((v, i) => {
            const free = Math.max(0, v.total - v.busy)
            const hot = v.busy > 0
            const m = meta(v.venue_type)
            return (
              <ScrollReveal key={`${v.name}-${tab}-${i}`} delayMs={i * 80}>
                <div
                  className={cn(
                    "rounded-2xl nm-raised p-5 transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_10px_25px_rgba(0,0,0,0.4)] relative overflow-hidden group",
                    hot && "neon-border"
                  )}
                >
                  {/* Internal gentle glow gradient for active venues */}
                  {hot && <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-transparent to-transparent pointer-events-none z-0" />}
                  
                  <div className="flex items-start justify-between gap-2 relative z-10">
                    <div className="min-w-0">
                      <p className="truncate font-extrabold">{v.name}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <span className="rounded-full nm-inset px-2.5 py-1 font-bold text-[var(--primary)] whitespace-nowrap">{m.icon} {m.label}</span>
                        {v.city && <span className="truncate">{v.city}</span>}
                      </p>
                    </div>
                    {/* Compact pulse indicator to avoid rapid pings across many cards */}
                    <span className={cn(
                        "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 nm-inset transition-colors",
                        hot ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
                      )}
                    >
                      {hot && <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--primary)] opacity-70" /><span className="relative inline-flex size-full rounded-full bg-[var(--primary)]" /></span>}
                      {free > 0 ? `🟢 ${free} თავისუფალი` : 'სავსე'}
                    </span>
                  </div>
                  
                  <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[var(--background)]/60 relative z-10">
                    <div 
                      className="h-full rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)] transition-[width] duration-1000 ease-out" 
                      style={{ width: `${Math.max(1, v.occupancy)}%` }} 
                    />
                  </div>
                  <p className="mt-2 text-xs font-medium text-[var(--muted-foreground)] relative z-10">
                    {v.busy} / {v.total} {m.unit} დაკავებული · <span className="text-[var(--foreground)]">{v.occupancy}%</span>
                  </p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </section>

      <div className="pt-4 text-center">
        <ScrollReveal delayMs={300}>
           <p className="inline-flex items-center gap-1.5 rounded-full nm-inset px-4 py-1.5 text-xs text-[var(--muted-foreground)]">
             <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-70" /><span className="relative inline-flex size-full rounded-full bg-red-400" /></span>
             ახლდება ცოცხლად
           </p>
        </ScrollReveal>
      </div>
    </div>
  )
}
