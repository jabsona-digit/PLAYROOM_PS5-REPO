'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Customer's tournament passes for /account: a QR (MTLT:<registration_id>) the operator
// scans at the venue to check in + collect the entry fee. Fetched client-side (the user
// is already authed on /account).
interface Reg {
  registration_id: string
  status: string
  paid_amount: number | null
  name: string
  game: string | null
  starts_at: string | null
  entry_fee: number | null
  t_status: string
  venue_name: string | null
  venue_city: string | null
}

export function MyTournamentPasses() {
  const [regs, setRegs] = useState<Reg[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(supabase.rpc as unknown as (f: string) => Promise<{ data: Reg[] | null }>)(
      'get_my_tournament_registrations',
    ).then(({ data }) => {
      setRegs(data ?? [])
      setLoaded(true)
    })
  }, [])

  if (!loaded || regs.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
        <Trophy className="size-5 text-[var(--primary)]" /> ჩემი ტურნირები
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {regs.map((r) => (
          <div key={r.registration_id} className="nm-raised rounded-2xl p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold">
                  {r.name}
                  {r.game && <span className="text-[var(--muted-foreground)]"> · {r.game}</span>}
                </p>
                {r.venue_name && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {r.venue_name}
                    {r.venue_city && `, ${r.venue_city}`}
                  </p>
                )}
                {r.starts_at && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(r.starts_at).toLocaleString('ka-GE', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs font-bold text-[var(--primary)]">
                {r.status === 'checked_in'
                  ? '✅ გავლილი'
                  : r.status === 'cancelled'
                    ? '❌ გაუქმდა'
                    : '🎟️ რეგისტრ.'}
              </span>
            </div>

            {r.status !== 'cancelled' && (
              <div className="mt-3 flex flex-col items-center gap-2 border-t border-[var(--border)] pt-3">
                <div className="rounded-2xl bg-white p-3">
                  <QRCodeSVG value={`MTLT:${r.registration_id}`} size={150} level="M" />
                </div>
                <p className="text-center text-xs text-[var(--muted-foreground)]">
                  {r.status === 'checked_in'
                    ? 'შემოწმებული — წარმატებას გისურვებ! 🏆'
                    : `აჩვენე ეს QR კლუბში${r.entry_fee ? ` · საწევრო ${r.entry_fee}₾ ადგილზე` : ''}`}
                </p>
                <p className="font-mono text-xs text-[var(--muted-foreground)]">
                  {r.registration_id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
