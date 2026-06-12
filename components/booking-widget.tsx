'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { gel } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type Busy = { start: string; end: string }
type Row = { console_id: number; console_name: string; slot_number: number; busy: Busy[] }
export type Plan = Database['public']['Views']['public_venue_plans']['Row']

const START_HOUR = 10
const END_HOUR = 24
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const DURATIONS = [60, 90, 120, 180, 240]

function dayLabel(d: Date) {
  const days = ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ']
  return { dow: days[d.getDay()], day: d.getDate() }
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function BookingWidget({
  slug,
  plans,
  isAuthed,
  defaultName,
  defaultPhone,
}: {
  slug: string
  plans: Plan[]
  isAuthed: boolean
  defaultName: string
  defaultPhone: string
}) {
  const router = useRouter()
  const dates = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      return d
    })
  }, [])

  const [selDate, setSelDate] = useState(0)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const [pick, setPick] = useState<{ consoleId: number; consoleName: string; hour: number } | null>(null)
  const [duration, setDuration] = useState(60)
  const [planId, setPlanId] = useState<number | null>(plans[0]?.plan_id ?? null)
  const [name, setName] = useState(defaultName)
  const [phone, setPhone] = useState(defaultPhone)
  const [pay, setPay] = useState<'transfer' | 'cash_on_arrival'>('transfer')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const loadAvailability = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.rpc('get_venue_availability', {
      p_slug: slug,
      p_date: toISODate(dates[selDate]),
    })
    setRows(((data ?? []) as Row[]).sort((a, b) => a.slot_number - b.slot_number))
    setLoading(false)
  }, [slug, selDate, dates])

  useEffect(() => {
    loadAvailability()
    setPick(null)
    setError(null)
    setDone(false)
  }, [loadAvailability])

  const now = new Date()
  function cellDate(hour: number) {
    const d = new Date(dates[selDate])
    d.setHours(hour, 0, 0, 0)
    return d
  }
  function isBusy(busy: Busy[], h: number) {
    const cs = cellDate(h)
    const ce = new Date(cs)
    ce.setHours(h + 1)
    return busy.some((b) => new Date(b.start) < ce && new Date(b.end) > cs)
  }
  function isPast(h: number) {
    return cellDate(h) <= now
  }

  const selectedPlan = plans.find((p) => p.plan_id === planId) ?? null
  const total = selectedPlan ? Number(selectedPlan.price_per_hour) * (duration / 60) : 0

  async function submit() {
    if (!pick) return
    if (!isAuthed) {
      router.push(`/auth/login?next=/${encodeURIComponent(slug)}`)
      return
    }
    if (!name.trim() || !phone.trim()) {
      setError('შეავსე სახელი და ტელეფონი')
      return
    }
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const start = cellDate(pick.hour)
    const { error } = await supabase.rpc('create_marketplace_booking', {
      p_slug: slug,
      p_start: start.toISOString(),
      p_duration_min: duration,
      p_customer_name: name.trim(),
      p_customer_phone: phone.trim(),
      p_console_id: pick.consoleId,
      p_pricing_plan_id: planId ?? undefined,
      p_controllers: selectedPlan?.controllers ?? 2,
      p_payment_method: pay,
    })
    setSubmitting(false)
    if (error) {
      setError(
        /booking_conflict/.test(error.message)
          ? 'ეს დრო უკვე დაკავებულია, აირჩიე სხვა'
          : /start_in_past/.test(error.message)
            ? 'არჩეული დრო უკვე გასულია'
            : 'ჯავშნა ვერ შესრულდა, სცადე თავიდან',
      )
      loadAvailability()
      return
    }
    setDone(true)
    setPick(null)
    loadAvailability()
  }

  return (
    <div className="nm-raised rounded-2xl p-4 sm:p-5">
      {/* Date selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dates.map((d, i) => {
          const { dow, day } = dayLabel(d)
          return (
            <button
              key={i}
              onClick={() => setSelDate(i)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-center transition ${i === selDate ? 'nm-glow' : 'nm-btn'}`}
            >
              <div className="text-xs text-[var(--muted-foreground)]">{dow}</div>
              <div className="font-semibold">{day}</div>
            </button>
          )
        })}
      </div>

      {/* Hour scale */}
      <div className="mt-4 flex items-center gap-1 pl-[88px] text-[10px] text-[var(--muted-foreground)]">
        {HOURS.filter((h) => h % 2 === 0).map((h) => (
          <div key={h} className="flex-1 text-left">{h}:00</div>
        ))}
      </div>

      {/* Console rows */}
      {loading ? (
        <div className="py-10 text-center text-[var(--muted-foreground)] text-sm">იტვირთება…</div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-[var(--muted-foreground)] text-sm">კონსოლები არ მოიძებნა.</div>
      ) : (
        <div className="mt-1 space-y-1.5">
          {rows.map((r) => (
            <div key={r.console_id} className="flex items-center gap-2">
              <div className="w-20 shrink-0 text-sm font-medium truncate">{r.console_name}</div>
              <div className="flex flex-1 gap-0.5">
                {HOURS.map((h) => {
                  const busy = isBusy(r.busy, h)
                  const past = isPast(h)
                  const picked = pick?.consoleId === r.console_id && pick?.hour === h
                  const disabled = busy || past
                  return (
                    <button
                      key={h}
                      disabled={disabled}
                      onClick={() => setPick({ consoleId: r.console_id, consoleName: r.console_name, hour: h })}
                      title={`${h}:00`}
                      className={`h-7 flex-1 rounded-[5px] transition-colors ${
                        picked
                          ? 'bg-[var(--primary)] ring-2 ring-[var(--primary)]'
                          : busy
                            ? 'bg-[var(--status-busy)]/70 cursor-not-allowed'
                            : past
                              ? 'bg-[var(--surface)] opacity-40 cursor-not-allowed'
                              : 'bg-[var(--status-free)]/25 hover:bg-[var(--status-free)]/50'
                      }`}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-[var(--status-free)]/40" /> თავისუფალი</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-[var(--status-busy)]/70" /> დაკავებული</span>
      </div>

      {done && (
        <div className="mt-4 nm-inset rounded-xl p-4 text-center text-[var(--status-free)] text-sm">
          ✅ ჯავშნა მიღებულია! კლუბი დაგიკავშირდება დასადასტურებლად. იხილე{' '}
          <a href="/account" className="underline">ჩემი ჯავშნები</a>.
        </div>
      )}

      {/* Booking form */}
      {pick && !done && (
        <div className="mt-4 nm-inset rounded-2xl p-4 space-y-4 animate-in-up">
          <div className="flex items-center justify-between">
            <div className="font-semibold">
              {pick.consoleName} · {toISODate(dates[selDate])} · {pick.hour}:00
            </div>
            <button onClick={() => setPick(null)} className="text-sm text-[var(--muted-foreground)]">გაუქმება</button>
          </div>

          {/* Duration */}
          <div>
            <div className="text-sm text-[var(--muted-foreground)] mb-1.5">ხანგრძლივობა</div>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${duration === d ? 'nm-glow' : 'nm-btn'}`}
                >
                  {d % 60 === 0 ? `${d / 60} სთ` : `${Math.floor(d / 60)}:${d % 60}`}
                </button>
              ))}
            </div>
          </div>

          {/* Plan */}
          {plans.length > 0 && (
            <div>
              <div className="text-sm text-[var(--muted-foreground)] mb-1.5">ტარიფი</div>
              <div className="flex flex-wrap gap-2">
                {plans.map((p) => (
                  <button
                    key={p.plan_id}
                    onClick={() => setPlanId(p.plan_id)}
                    className={`rounded-lg px-3 py-1.5 text-sm text-left ${planId === p.plan_id ? 'nm-glow' : 'nm-btn'}`}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {gel(p.price_per_hour)}/სთ · {p.controllers} ჯოისტიკი
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="სახელი და გვარი"
              className="nm-raised-sm rounded-xl px-3 py-2 text-sm outline-none"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="ტელეფონი"
              type="tel"
              className="nm-raised-sm rounded-xl px-3 py-2 text-sm outline-none"
            />
          </div>

          {/* Payment */}
          <div>
            <div className="text-sm text-[var(--muted-foreground)] mb-1.5">გადახდა</div>
            <div className="flex gap-2">
              <button onClick={() => setPay('transfer')} className={`rounded-lg px-3 py-1.5 text-sm ${pay === 'transfer' ? 'nm-glow' : 'nm-btn'}`}>
                გადარიცხვა
              </button>
              <button onClick={() => setPay('cash_on_arrival')} className={`rounded-lg px-3 py-1.5 text-sm ${pay === 'cash_on_arrival' ? 'nm-glow' : 'nm-btn'}`}>
                ადგილზე
              </button>
              <button disabled title="მალე" className="rounded-lg px-3 py-1.5 text-sm nm-btn opacity-40 cursor-not-allowed">
                ბარათით (მალე)
              </button>
            </div>
          </div>

          {/* Total + submit */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-sm">
              <span className="text-[var(--muted-foreground)]">ჯამი: </span>
              <span className="text-lg font-bold text-[var(--primary)]">{gel(total)}</span>
            </div>
            <button
              onClick={submit}
              disabled={submitting}
              className="nm-glow rounded-xl px-6 py-2.5 font-semibold"
            >
              {submitting ? '...' : isAuthed ? 'დაჯავშნა' : 'შესვლა და დაჯავშნა'}
            </button>
          </div>

          {error && <p className="text-sm text-[var(--status-busy)] text-center">{error}</p>}
        </div>
      )}
    </div>
  )
}
