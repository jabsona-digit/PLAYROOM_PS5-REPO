'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { gel } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type Busy = { start: string; end: string }
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
  const [capacity, setCapacity] = useState(0)
  const [busy, setBusy] = useState<Busy[]>([])
  const [loading, setLoading] = useState(true)

  const [pick, setPick] = useState<number | null>(null) // selected start hour
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
    const row = (data as unknown as { capacity: number; busy: Busy[] }[] | null)?.[0]
    setCapacity(row?.capacity ?? 0)
    setBusy(Array.isArray(row?.busy) ? row!.busy : [])
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
  // free consoles during hour h = capacity − overlapping busy intervals
  function freeAt(h: number) {
    const cs = cellDate(h)
    const ce = new Date(cs)
    ce.setHours(h + 1)
    const used = busy.filter((b) => new Date(b.start) < ce && new Date(b.end) > cs).length
    return Math.max(0, capacity - used)
  }
  function isPast(h: number) {
    return cellDate(h) <= now
  }

  const selectedPlan = plans.find((p) => p.plan_id === planId) ?? null
  const total = selectedPlan ? Number(selectedPlan.price_per_hour) * (duration / 60) : 0

  async function submit() {
    if (pick == null) return
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
    const start = cellDate(pick)
    const { error } = await supabase.rpc('create_marketplace_booking', {
      p_slug: slug,
      p_start: start.toISOString(),
      p_duration_min: duration,
      p_customer_name: name.trim(),
      p_customer_phone: phone.trim(),
      p_pricing_plan_id: planId ?? undefined,
      p_controllers: selectedPlan?.controllers ?? 2,
      p_payment_method: pay,
    })
    setSubmitting(false)
    if (error) {
      setError(
        /no_capacity/.test(error.message)
          ? 'ამ დროს ყველა კონსოლი დაკავებულია — აირჩიე სხვა საათი'
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

      {/* Free-slot timeline (one cell per hour, shows how many consoles are free) */}
      {loading ? (
        <div className="py-10 text-center text-sm text-[var(--muted-foreground)]">იტვირთება…</div>
      ) : capacity === 0 ? (
        <div className="py-10 text-center text-sm text-[var(--muted-foreground)]">კონსოლები არ მოიძებნა.</div>
      ) : (
        <div className="mt-4">
          <div className="flex gap-1">
            {HOURS.map((h) => {
              const free = freeAt(h)
              const past = isPast(h)
              const disabled = past || free === 0
              const picked = pick === h
              return (
                <button
                  key={h}
                  disabled={disabled}
                  onClick={() => setPick(h)}
                  title={`${h}:00 — ${free} თავისუფალი`}
                  className={`flex h-12 flex-1 flex-col items-center justify-center rounded-md text-xs transition-colors ${
                    picked
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] ring-2 ring-[var(--primary)]'
                      : past
                        ? 'bg-[var(--surface)] opacity-30'
                        : free === 0
                          ? 'bg-[var(--status-busy)]/60'
                          : 'bg-[var(--status-free)]/20 hover:bg-[var(--status-free)]/40'
                  }`}
                >
                  <span className="font-bold leading-none">{past ? '·' : free}</span>
                </button>
              )
            })}
          </div>
          {/* hour scale */}
          <div className="mt-1 flex gap-1 text-[9px] text-[var(--muted-foreground)]">
            {HOURS.map((h) => (
              <div key={h} className="flex-1 text-center">
                {h % 2 === 0 ? h : ''}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            ციფრი = თავისუფალი კონსოლების რაოდენობა იმ საათში. აირჩიე დაწყების დრო.
          </p>
        </div>
      )}

      {done && (
        <div className="mt-4 nm-inset rounded-xl p-4 text-center text-sm text-[var(--status-free)]">
          ✅ ჯავშნა მიღებულია! კლუბი დაგიკავშირდება დასადასტურებლად. იხილე{' '}
          <a href="/account" className="underline">ჩემი ჯავშნები</a>.
        </div>
      )}

      {/* Booking form */}
      {pick != null && !done && (
        <div className="mt-4 nm-inset space-y-4 rounded-2xl p-4 animate-in-up">
          <div className="flex items-center justify-between">
            <div className="font-semibold">
              {toISODate(dates[selDate])} · {pick}:00 ·{' '}
              <span className="text-[var(--status-free)]">{freeAt(pick)} თავისუფალი</span>
            </div>
            <button onClick={() => setPick(null)} className="text-sm text-[var(--muted-foreground)]">
              გაუქმება
            </button>
          </div>

          {/* Duration */}
          <div>
            <div className="mb-1.5 text-sm text-[var(--muted-foreground)]">ხანგრძლივობა</div>
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
              <div className="mb-1.5 text-sm text-[var(--muted-foreground)]">ტარიფი</div>
              <div className="flex flex-wrap gap-2">
                {plans.map((p) => (
                  <button
                    key={p.plan_id}
                    onClick={() => setPlanId(p.plan_id)}
                    className={`rounded-lg px-3 py-1.5 text-left text-sm ${planId === p.plan_id ? 'nm-glow' : 'nm-btn'}`}
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="სახელი და გვარი" className="nm-raised-sm rounded-xl px-3 py-2 text-sm outline-none" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="ტელეფონი" type="tel" className="nm-raised-sm rounded-xl px-3 py-2 text-sm outline-none" />
          </div>

          {/* Payment */}
          <div>
            <div className="mb-1.5 text-sm text-[var(--muted-foreground)]">გადახდა</div>
            <div className="flex gap-2">
              <button onClick={() => setPay('transfer')} className={`rounded-lg px-3 py-1.5 text-sm ${pay === 'transfer' ? 'nm-glow' : 'nm-btn'}`}>გადარიცხვა</button>
              <button onClick={() => setPay('cash_on_arrival')} className={`rounded-lg px-3 py-1.5 text-sm ${pay === 'cash_on_arrival' ? 'nm-glow' : 'nm-btn'}`}>ადგილზე</button>
              <button disabled title="მალე" className="nm-btn cursor-not-allowed rounded-lg px-3 py-1.5 text-sm opacity-40">ბარათით (მალე)</button>
            </div>
          </div>

          {/* Total + submit */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-sm">
              <span className="text-[var(--muted-foreground)]">ჯამი: </span>
              <span className="text-lg font-bold text-[var(--primary)]">{gel(total)}</span>
            </div>
            <button onClick={submit} disabled={submitting} className="nm-glow rounded-xl px-6 py-2.5 font-semibold">
              {submitting ? '...' : isAuthed ? 'დაჯავშნა' : 'შესვლა და დაჯავშნა'}
            </button>
          </div>

          {error && <p className="text-center text-sm text-[var(--status-busy)]">{error}</p>}
        </div>
      )}
    </div>
  )
}
