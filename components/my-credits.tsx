'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Gift } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Free play-time the customer won (e.g. 3rd place in a tournament -> prize_third_minutes).
// Recorded server-side as a customer_credits row; redeemable at the venue. The operator
// scans the QR (MTLC:<id>) or types the short code at checkout to discount the play charge.
// Fetched client-side (user is already authed on /account).
interface Credit {
  id: string
  code: string | null
  minutes: number
  minutes_used: number
  remaining: number
  status: string
  note: string | null
  venue_name: string | null
  venue_city: string | null
  created_at: string
  expires_at: string | null
}

export function MyCredits() {
  const [credits, setCredits] = useState<Credit[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(supabase.rpc as unknown as (f: string) => Promise<{ data: Credit[] | null }>)(
      'get_my_credits',
    ).then(({ data }) => {
      setCredits(data ?? [])
      setLoaded(true)
    })
  }, [])

  if (!loaded || credits.length === 0) return null

  const totalRemaining = credits.reduce((s, c) => s + (c.remaining ?? 0), 0)

  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
        <Gift className="size-5 text-[var(--primary)]" /> უფასო სათამაშო დრო
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {credits.map((c) => (
          <div key={c.id} className="nm-raised rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xl font-extrabold text-[var(--primary)]">{c.remaining} წთ</span>
              <span className="text-xs font-bold text-[var(--status-free)]">🎁 მოგებული</span>
            </div>
            {c.note && <p className="mt-1 text-sm font-semibold">{c.note}</p>}
            {c.venue_name && (
              <p className="text-xs text-[var(--muted-foreground)]">
                {c.venue_name}
                {c.venue_city && `, ${c.venue_city}`}
              </p>
            )}
            {c.minutes_used > 0 && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                გამოყენებული: {c.minutes_used} / {c.minutes} წთ
              </p>
            )}

            {/* redeem code + QR — the operator scans/enters this at checkout */}
            <div className="mt-3 flex items-center gap-3 border-t border-[var(--border)] pt-3">
              <div className="rounded-xl bg-white p-2">
                <QRCodeSVG value={`MTLC:${c.id}`} size={84} level="M" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-[var(--muted-foreground)]">კოდი</p>
                <p className="font-mono text-xl font-black tracking-widest text-[var(--primary)]">
                  {c.code ?? c.id.slice(0, 6).toUpperCase()}
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)] text-pretty">
                  აჩვენე კლუბში სათამაშოდ — ოპერატორი ჩამოგაჭრის უფასო წუთებს.
                  {c.expires_at &&
                    ` მოქმედებს ${new Date(c.expires_at).toLocaleDateString('ka-GE', { dateStyle: 'short' })}-მდე.`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {credits.length > 1 && (
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          ჯამში: <span className="font-bold text-[var(--primary)]">{totalRemaining} წთ</span> უფასო თამაში
        </p>
      )}
    </section>
  )
}
