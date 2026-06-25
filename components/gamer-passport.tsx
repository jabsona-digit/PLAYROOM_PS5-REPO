'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

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
  first_booking: { title: 'პირველი ნაბიჯი', desc: 'პირველი ვიზიტი', icon: '🎮' },
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
  const [flipped, setFlipped] = useState(false)
  const [me, setMe] = useState<{ id: string; name: string } | null>(null)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(supabase.rpc as unknown as (f: string) => Promise<{ data: Passport | null }>)(
      'get_gamer_passport',
    ).then(({ data }) => {
      setP(data && (data as Passport).stats ? data : null)
      setLoaded(true)
    })
    // Real identity for the passport QR (MTLM:<marketplace_customer_id>) + the displayed name.
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user
      if (!u) return
      const { data: mc } = await supabase.from('marketplace_customers').select('full_name').eq('id', u.id).maybeSingle()
      const name = (mc as { full_name?: string } | null)?.full_name
        || (u.user_metadata?.full_name as string | undefined)
        || u.email
        || 'მოთამაშე'
      setMe({ id: u.id, name })
    })
  }, [])

  if (!loaded || !p) return null
  const s = p.stats
  const pct = Math.min(100, Math.round((s.level_xp / s.next_level_xp) * 100))
  const earnedCount = p.badges.filter((b) => b.earned).length

  return (
    <>
    <div className="mb-10 w-full" style={{ perspective: '1200px' }}>
      <button
        onClick={() => setFlipped(!flipped)}
        className="group relative w-full text-left outline-none block"
        aria-label={flipped ? "დაბრუნება წინა მხარეს" : "QR კოდის ჩვენება"}
      >
        <div
          className={cn(
            "relative w-full rounded-3xl transition-all duration-[800ms] shadow-[0_10px_30px_rgba(0,0,0,0.2)] md:group-hover:-translate-y-2 md:group-hover:shadow-[0_20px_40px_var(--primary-glow)] motion-reduce:transition-none motion-reduce:shadow-none",
            flipped ? "[transform:rotateY(180deg)]" : "md:group-hover:[transform:rotateY(180deg)]"
          )}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front Face */}
          <section
            className="w-full bg-[var(--background)] nm-raised rounded-3xl p-6 md:p-8"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <span className="text-2xl">🪪</span> გეიმერ პასპორტი
                </h2>
                {me?.name && <p className="mt-0.5 truncate text-sm font-semibold text-[var(--primary)]">{me.name}</p>}
              </div>
              <span className="nm-inset rounded-full px-4 py-1.5 text-sm font-extrabold text-[var(--primary)] text-glow neon-border flex items-center gap-1.5">
                LVL {s.level}
                {s.level >= 5 && <span className="relative flex size-1.5 ml-1"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--primary)]" /><span className="relative inline-flex size-full rounded-full bg-[var(--primary)]" /></span>}
              </span>
            </div>

            {/* XP bar */}
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-[var(--muted-foreground)]">
              <span>გამოცდილება</span>
              <span>
                {s.level_xp} / {s.next_level_xp} XP
              </span>
            </div>
            <div className="nm-inset mb-6 h-3.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-[var(--primary)] shadow-[0_0_10px_var(--primary)] transition-all duration-1000 ease-out"
                style={{ width: `${Math.max(5, pct)}%` }}
              />
            </div>

            {/* Stats Grid */}
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat icon="🎮" value={s.visits} label="ვიზიტი" />
              <Stat icon="⚔️" value={s.tournaments} label="ტურნირი" />
              <Stat icon="🏆" value={s.wins} label="მოგება" />
              <Stat icon="💎" value={`${Math.round(s.spent)}₾`} label="დახარჯული" />
            </div>

            {/* Badges */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--muted-foreground)]">ბეჯები</h3>
              <span className="text-xs font-bold text-[var(--primary)]">
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
                    className={cn(
                      "nm-inset flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-4 text-center transition-all duration-300",
                      b.earned ? "hover:neon-border group/badge" : "opacity-40 grayscale"
                    )}
                  >
                    <span className="text-2xl transition-transform group-hover/badge:scale-110">{meta.icon}</span>
                    <span className="text-[10px] font-bold leading-tight">{meta.title}</span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Back Face (QR Code) */}
          <section
            className="absolute inset-0 h-full w-full bg-[var(--background)] nm-raised rounded-3xl flex flex-col items-center justify-center p-8 border border-[var(--primary)]/10"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {/* Subtle Neon Center Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[var(--primary)] opacity-[0.03] blur-[100px] pointer-events-none" />
            
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-[var(--primary)] text-glow relative z-10">
              <QrCode className="size-6" /> QR იდენტიფიკაცია
            </h3>
            
            <div className="nm-inset p-5 rounded-3xl bg-white mb-8 relative z-10 hover:scale-105 transition-transform duration-500">
              {me?.id ? (
                <QRCodeSVG value={`MTLM:${me.id}`} size={208} level="M" />
              ) : (
                <div className="size-52 animate-pulse rounded-xl bg-black/10" />
              )}
            </div>
            
            <p className="text-sm font-medium text-[var(--muted-foreground)] text-center max-w-[240px] relative z-10 pb-4">
              წარადგინე კლუბის ადმინისტრაციასთან სკანირებისა და ქულების დასარიცხად.
            </p>
          </section>
        </div>
      </button>

      {/* Plain, un-transformed QR for actual SCANNING. The flip-card's 3D-transformed back
          face does not decode reliably; this flat overlay always does. */}
      {me?.id && (
        <button
          onClick={() => setShowQR(true)}
          className="nm-glow mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-[var(--primary)]"
        >
          <QrCode className="size-4" /> QR კოდი (სკანირებისთვის)
        </button>
      )}
    </div>

    {showQR && me?.id && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        onClick={() => setShowQR(false)}
      >
        <div className="rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <QRCodeSVG value={`MTLM:${me.id}`} size={244} level="M" />
          <p className="mt-3 text-center text-sm font-bold text-black">წარადგინე ადმინთან 📷</p>
        </div>
      </div>
    )}
    </>
  )
}

function Stat({ icon, value, label }: { icon: string; value: number | string; label: string }) {
  return (
    <div className="nm-inset rounded-2xl px-3 py-3.5 text-center flex flex-col items-center justify-center transition-all hover:neon-border bg-[var(--surface)]">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-xl font-black tabular-nums text-[var(--primary)]">{value}</div>
      <div className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}
