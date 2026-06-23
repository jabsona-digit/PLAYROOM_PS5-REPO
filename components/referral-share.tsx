'use client'

// /account referral share card: the player's link + QR (play.martelounge.ge/?ref=CODE),
// invite count and earned points (get_my_referral, migration 0131).
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'
import { Share2, Copy, Check } from 'lucide-react'

interface MyRef {
  code: string
  referred_count: number
  total_earned: number
}

export function ReferralShare() {
  const [r, setR] = useState<MyRef | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(supabase.rpc as unknown as (f: string) => Promise<{ data: MyRef | null }>)('get_my_referral')
      .then(({ data }) => setR(data ?? null))
  }, [])

  if (!r?.code) return null
  const link = `https://play.martelounge.ge/?ref=${r.code}`

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ }
  }
  const share = async () => {
    try {
      if (typeof navigator !== 'undefined' && (navigator as Navigator).share) {
        await (navigator as Navigator).share({ title: 'Martelounge', text: 'შემოგვიერთდი Martelounge-ზე და ითამაშე! 🎮', url: link })
      } else { await copy() }
    } catch { /* user cancelled */ }
  }

  return (
    <div className="mb-10 nm-raised rounded-3xl p-6 md:p-8">
      <h2 className="flex items-center gap-2 text-lg font-bold text-glow">
        <Share2 className="size-5 text-[var(--primary)]" /> მოიწვიე & გამოიმუშავე
      </h2>
      <p className="mt-1 text-sm text-[var(--muted-foreground)] text-pretty">
        გააზიარე შენი ლინკი — ვინც დარეგისტრირდება და ითამაშებს, შენ იღებ მათი ნათამაშების
        {' '}<b className="text-[var(--primary)]">3%-ს</b> ქულებად.
      </p>

      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">
        <div className="shrink-0 rounded-3xl bg-white p-4">
          <QRCodeSVG value={link} size={120} level="M" />
        </div>
        <div className="w-full min-w-0">
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="nm-inset w-full rounded-xl px-3 py-2.5 text-sm font-mono outline-none"
            />
            <button onClick={copy} title="კოპირება" className="nm-btn shrink-0 rounded-xl px-3 text-[var(--primary)]">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
          <button
            onClick={share}
            className="nm-glow mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold"
          >
            <Share2 className="size-4" /> გაზიარება
          </button>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="nm-inset rounded-2xl px-3 py-2.5 text-center">
              <p className="text-[10px] text-[var(--muted-foreground)]">მოწვეული</p>
              <p className="font-mono text-lg font-extrabold">{r.referred_count}</p>
            </div>
            <div className="nm-inset rounded-2xl px-3 py-2.5 text-center">
              <p className="text-[10px] text-[var(--muted-foreground)]">დაგროვილი</p>
              <p className="font-mono text-lg font-extrabold text-[var(--primary)]">{Math.round(Number(r.total_earned))} ქ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
