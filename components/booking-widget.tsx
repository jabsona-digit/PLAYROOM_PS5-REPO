'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { gel } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type Busy = { start: string; end: string }
type TypeRow = { console_type: string; capacity: number; busy: Busy[] }
type ConsoleRow = { console_id: number; name: string; console_type: string; busy: Busy[] }
export type Plan = Database['public']['Views']['public_venue_plans']['Row']

const START_HOUR = 10
const END_HOUR = 24
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const DURATIONS = [60, 90, 120, 180, 240]

const TYPE_LABEL: Record<string, string> = {
  standard: 'PS5', coupe: 'კუპე', vip: 'VIP', billiard: 'ბილიარდი', snooker: 'სნუკერი',
}
const typeLabel = (t: string) => TYPE_LABEL[t] ?? t.charAt(0).toUpperCase() + t.slice(1)
// controllers (ჯოისტიკი) are a playroom concept — billiard tables don't have them
const BILLIARD_TYPES = new Set(['billiard', 'snooker'])
const isBilliard = (t: string) => BILLIARD_TYPES.has(t)
// console_type → asset category (tariffs are tagged by category; null = all)
const categoryOf = (t: string) => (isBilliard(t) ? 'billiard' : 'playroom')
const planCategory = (p: Plan) => (p as { category?: string | null }).category ?? null

// Georgian mobile: 9 digits starting with 5 (optionally a +995 prefix).
const validGePhone = (raw: string) => {
  const d = raw.replace(/\D/g, '')
  const n = d.startsWith('995') ? d.slice(3) : d
  return /^5\d{8}$/.test(n)
}

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
}: {
  slug: string
  plans: Plan[]
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
  const [types, setTypes] = useState<TypeRow[]>([])
  const [consoles, setConsoles] = useState<ConsoleRow[]>([])
  const [selType, setSelType] = useState<string>('standard')
  const [loading, setLoading] = useState(true)

  const [pick, setPick] = useState<number | null>(null)
  const [pickedConsole, setPickedConsole] = useState<number | null>(null) // null = any (capacity)
  const [duration, setDuration] = useState(60)
  const [planId, setPlanId] = useState<number | null>(plans[0]?.plan_id ?? null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [authed, setAuthed] = useState(false)
  const [pay, setPay] = useState<'transfer' | 'cash_on_arrival'>('transfer')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const loadAvailability = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const p_date = toISODate(dates[selDate])
    // 1) the timeline — this must always resolve the loading state
    try {
      const { data } = await supabase.rpc('get_venue_availability', { p_slug: slug, p_date })
      const rows = (data as unknown as TypeRow[] | null) ?? []
      setTypes(rows)
      setSelType((prev) => (rows.some((r) => r.console_type === prev) ? prev : rows[0]?.console_type ?? 'standard'))
    } catch {
      setTypes([])
    }
    // 2) per-console availability — best-effort; never blocks the timeline
    try {
      const rpcLoose = supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown }>
      const { data: cdata } = await rpcLoose('get_venue_consoles', { p_slug: slug, p_date })
      setConsoles((cdata as ConsoleRow[] | null) ?? [])
    } catch {
      setConsoles([])
    }
    setLoading(false)
  }, [slug, selDate, dates])

  useEffect(() => {
    loadAvailability()
    setPick(null)
    setError(null)
    setDone(false)
  }, [loadAvailability])

  // Auth resolved client-side (keeps the venue page ISR-cacheable); prefill name
  // and phone from the session's user metadata.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      if (!u) return
      setAuthed(true)
      setName((prev) => prev || ((u.user_metadata?.full_name as string) ?? ''))
      setPhone((prev) => prev || ((u.user_metadata?.phone as string) ?? ''))
    })
  }, [])

  const current = types.find((t) => t.console_type === selType) ?? null
  const capacity = current?.capacity ?? 0
  const busy = current?.busy ?? []

  const now = new Date()
  function cellDate(hour: number) {
    const d = new Date(dates[selDate])
    d.setHours(hour, 0, 0, 0)
    return d
  }
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

  // only tariffs for the selected type's category (or untagged = all)
  const shownPlans = useMemo(
    () => plans.filter((p) => { const c = planCategory(p); return c == null || c === categoryOf(selType) }),
    [plans, selType],
  )
  // keep the picked tariff valid when the type (hence category) changes
  useEffect(() => {
    setPlanId((prev) => (shownPlans.some((p) => p.plan_id === prev) ? prev : shownPlans[0]?.plan_id ?? null))
  }, [shownPlans])

  const selectedPlan = shownPlans.find((p) => p.plan_id === planId) ?? null
  const total = selectedPlan ? Number(selectedPlan.price_per_hour) * (duration / 60) : 0
  const phoneValid = validGePhone(phone)

  // free SPECIFIC units of the selected type for the picked window (optional pick)
  const winStart = pick != null ? cellDate(pick).getTime() : 0
  const winEnd = winStart + duration * 60000
  const freeConsoles = pick == null ? [] : consoles
    .filter((c) => c.console_type === selType)
    .filter((c) => !(c.busy ?? []).some((b) => new Date(b.start).getTime() < winEnd && new Date(b.end).getTime() > winStart))
  // the specific pick is a preference — reset it when slot / type / duration changes
  useEffect(() => { setPickedConsole(null) }, [pick, selType, duration])

  async function submit() {
    if (pick == null) return
    if (!name.trim()) {
      setError('შეავსე სახელი')
      return
    }
    if (!phoneValid) {
      setError('შეიყვანე სრული მობილური ნომერი (მაგ. 5XX XX XX XX)')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      // Validate the session with the SERVER (not just read a stored one). A dead /
      // unrefreshable token makes the authenticated RPC throw — the real cause of the
      // "freeze" then "network error". If the session is invalid, re-authenticate.
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) {
        setError('სესია ამოიწურა — გამოდი და შედი ხელახლა.')
        router.push(`/auth/login?next=/${encodeURIComponent(slug)}`)
        return
      }
      const start = cellDate(pick)
      // p_console_id isn't in the generated arg types until regen → loose-cast the call
      const rpcBook = supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
      // Guard against a request that never settles (expired-token refresh / network
      // stall) so the button can't freeze on "..." forever.
      const TIMEOUT = Symbol('timeout')
      const res = await Promise.race([
        rpcBook('create_marketplace_booking', {
          p_slug: slug,
          p_start: start.toISOString(),
          p_duration_min: duration,
          p_customer_name: name.trim(),
          p_customer_phone: phone.trim(),
          p_console_type: selType,
          p_pricing_plan_id: planId ?? undefined,
          p_controllers: selectedPlan?.controllers ?? 2,
          p_payment_method: pay,
          p_console_id: pickedConsole ?? undefined,
        }),
        new Promise<typeof TIMEOUT>((r) => setTimeout(() => r(TIMEOUT), 15000)),
      ])
      if (res === TIMEOUT) {
        setError('ქსელი ნელია — ჯავშნა ვერ დასრულდა. შეამოწმე კავშირი და სცადე თავიდან.')
        return
      }
      const { error } = res
      if (error) {
        const m = error.message || ''
        // expired / missing session → the booking ran as anon. Re-authenticate.
        if (/unauthorized|jwt|token|expired|\b401\b|permission denied/i.test(m)) {
          setError('სესია ამოიწურა — გაიარე ავტორიზაცია ხელახლა.')
          router.push(`/auth/login?next=/${encodeURIComponent(slug)}`)
          return
        }
        setError(
          /console_taken/.test(m)
            ? 'ეს კონკრეტული ერთეული ამ დროს დაკავდა — აირჩიე სხვა ან „ნებისმიერი"'
            : /no_capacity/.test(m)
              ? `ამ დროს ყველა ${typeLabel(selType)} დაკავებულია — აირჩიე სხვა საათი`
              : /start_in_past/.test(m)
                ? 'არჩეული დრო უკვე გასულია'
                : 'ჯავშნა ვერ შესრულდა, სცადე თავიდან',
        )
        loadAvailability()
        return
      }
      setDone(true)
      setPick(null)
      loadAvailability()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // a thrown auth/refresh failure means the session is dead → re-authenticate
      if (/auth|jwt|token|refresh|session|sign|401|403/i.test(msg)) {
        setError('სესია ამოიწურა — გამოდი და შედი ხელახლა.')
        router.push(`/auth/login?next=/${encodeURIComponent(slug)}`)
      } else {
        // surface the real error instead of a vague "network error"
        setError(`შეცდომა — ${msg || 'სცადე თავიდან'}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="nm-raised rounded-2xl p-4 sm:p-5">
      {/* Resource-type selector (only if the venue has more than one type) */}
      {types.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {types.map((t) => (
            <button
              key={t.console_type}
              onClick={() => {
                setSelType(t.console_type)
                setPick(null)
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${selType === t.console_type ? 'nm-glow' : 'nm-btn'}`}
            >
              {typeLabel(t.console_type)}{' '}
              <span className="text-xs text-[var(--muted-foreground)]">×{t.capacity}</span>
            </button>
          ))}
        </div>
      )}

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

      {/* Free-slot timeline */}
      {loading ? (
        <div className="py-10 text-center text-sm text-[var(--muted-foreground)]">იტვირთება…</div>
      ) : capacity === 0 ? (
        <div className="py-10 text-center text-sm text-[var(--muted-foreground)]">{isBilliard(selType) ? 'მაგიდები' : 'კონსოლები'} არ მოიძებნა.</div>
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
          <div className="mt-1 flex gap-1 text-[9px] text-[var(--muted-foreground)]">
            {HOURS.map((h) => (
              <div key={h} className="flex-1 text-center">
                {h % 2 === 0 ? h : ''}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            ციფრი = თავისუფალი {typeLabel(selType)}-ის რაოდენობა იმ საათში. აირჩიე დაწყების დრო.
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
              {typeLabel(selType)} · {toISODate(dates[selDate])} · {pick}:00 ·{' '}
              <span className="text-[var(--status-free)]">{freeAt(pick)} თავისუფალი</span>
            </div>
            <button onClick={() => setPick(null)} className="text-sm text-[var(--muted-foreground)]">
              გაუქმება
            </button>
          </div>

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

          {freeConsoles.length > 0 && (
            <div>
              <div className="mb-1.5 text-sm text-[var(--muted-foreground)]">
                კონკრეტული {isBilliard(selType) ? 'მაგიდა' : 'კონსოლი'} <span className="opacity-60">(არასავალდებულო)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPickedConsole(null)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${pickedConsole == null ? 'nm-glow' : 'nm-btn'}`}
                >
                  ✨ ნებისმიერი
                </button>
                {freeConsoles.map((c) => (
                  <button
                    key={c.console_id}
                    onClick={() => setPickedConsole(c.console_id)}
                    className={`rounded-lg px-3 py-1.5 text-sm ${pickedConsole === c.console_id ? 'nm-glow' : 'nm-btn'}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {shownPlans.length > 0 && (
            <div>
              <div className="mb-1.5 text-sm text-[var(--muted-foreground)]">ტარიფი</div>
              <div className="flex flex-wrap gap-2">
                {shownPlans.map((p) => (
                  <button
                    key={p.plan_id}
                    onClick={() => setPlanId(p.plan_id)}
                    className={`rounded-lg px-3 py-1.5 text-left text-sm ${planId === p.plan_id ? 'nm-glow' : 'nm-btn'}`}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {gel(p.price_per_hour)}/სთ{isBilliard(selType) ? '' : ` · ${p.controllers} ჯოისტიკი`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="სახელი და გვარი" className="nm-raised-sm rounded-xl px-3 py-2 text-sm outline-none" />
            <div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s]/g, ''))}
                placeholder="ტელეფონი (5XX XX XX XX)"
                type="tel"
                inputMode="tel"
                maxLength={16}
                className={`nm-raised-sm w-full rounded-xl px-3 py-2 text-sm outline-none ${phone.trim() && !phoneValid ? 'ring-1 ring-[var(--status-busy)]' : ''}`}
              />
              {phone.trim() && !phoneValid && (
                <p className="mt-1 text-xs text-[var(--status-busy)]">შეიყვანე სრული მობილური ნომერი</p>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-sm text-[var(--muted-foreground)]">გადახდა</div>
            <div className="flex gap-2">
              <button onClick={() => setPay('transfer')} className={`rounded-lg px-3 py-1.5 text-sm ${pay === 'transfer' ? 'nm-glow' : 'nm-btn'}`}>გადარიცხვა</button>
              <button onClick={() => setPay('cash_on_arrival')} className={`rounded-lg px-3 py-1.5 text-sm ${pay === 'cash_on_arrival' ? 'nm-glow' : 'nm-btn'}`}>ადგილზე</button>
              <button disabled title="მალე" className="nm-btn cursor-not-allowed rounded-lg px-3 py-1.5 text-sm opacity-40">ბარათით (მალე)</button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-sm">
              <span className="text-[var(--muted-foreground)]">ჯამი: </span>
              <span className="text-lg font-bold text-[var(--primary)]">{gel(total)}</span>
            </div>
            <button
              onClick={submit}
              disabled={submitting || (authed && (!name.trim() || !phoneValid))}
              className="nm-glow rounded-xl px-6 py-2.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '...' : authed ? 'დაჯავშნა' : 'შესვლა და დაჯავშნა'}
            </button>
          </div>

          {error && <p className="text-center text-sm text-[var(--status-busy)]">{error}</p>}
        </div>
      )}
    </div>
  )
}
