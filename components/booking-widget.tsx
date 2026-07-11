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
// console_type → asset class (playroom/billiard). VIP is a playroom SUB-type, not its
// own class — its own price comes from the tariff's console_type, not the category.
const categoryOf = (t: string) => (isBilliard(t) ? 'billiard' : 'playroom')
const planCategory = (p: Plan) => (p as { category?: string | null }).category ?? null
const planSubType = (p: Plan) => (p as { console_type?: string | null }).console_type ?? null

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
  const [pay, setPay] = useState<'transfer' | 'cash_on_arrival' | 'card'>('transfer')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  // online card pay (bank-pay edge fn): whether THIS venue can take it (owner has
  // TBC/BOG creds, or org test mode) — hides/shows the „ბარათით" option.
  const [cardPay, setCardPay] = useState<{ available: boolean; mock: boolean } | null>(null)
  const [payNote, setPayNote] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const supabase = createClient()
    supabase.functions
      .invoke('bank-pay', { body: { action: 'provider_status', slug } })
      .then(({ data }) => {
        if (!alive) return
        const d = data as { card_available?: boolean; mock?: boolean } | null
        setCardPay({ available: !!d?.card_available, mock: !!d?.mock })
      })
      .catch(() => { if (alive) setCardPay({ available: false, mock: false }) })
    return () => { alive = false }
  }, [slug])

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
      const { data: cdata } = await (supabase as unknown as {
        rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown }>
      }).rpc('get_venue_consoles', { p_slug: slug, p_date })
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
  // „ახლავე": TODAY's current hour stays bookable — the booking starts a couple of
  // minutes from now instead of the already-past top of the hour (the server rejects
  // p_start <= now()). Late night is prime time for a gaming lounge; without this the
  // whole grid went dead dots after 23:00 and looked broken (owner-reported).
  function isNowCell(h: number) {
    return selDate === 0 && cellDate(h) <= now && now < cellDate(h + 1)
  }
  function effStart(h: number) {
    return isNowCell(h) ? new Date(Date.now() + 2 * 60_000) : cellDate(h)
  }
  function freeAt(h: number) {
    const cs = effStart(h)
    const ce = new Date(cs.getTime() + 3_600_000)
    const used = busy.filter((b) => new Date(b.start) < ce && new Date(b.end) > cs).length
    return Math.max(0, capacity - used)
  }
  function isPast(h: number) {
    return cellDate(h) <= now && !isNowCell(h)
  }

  // only tariffs that apply to the selected type: asset class matches (or null) AND
  // sub-type matches (or null = all in that class). So VIP shows VIP tariffs only.
  const shownPlans = useMemo(
    () => plans.filter((p) => {
      const c = planCategory(p)
      const sub = planSubType(p)
      return (c == null || c === categoryOf(selType)) && (sub == null || sub === selType)
    }),
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
  const winStart = pick != null ? effStart(pick).getTime() : 0
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
      const start = effStart(pick)
      // p_console_id isn't in the generated arg types until regen → loose-cast.
      // NB: must call as supabase.rpc(...) (a MEMBER call). Pulling the method into a
      // bare variable loses `this`, so supabase reads `this.rest` on undefined and
      // throws "Cannot read properties of undefined (reading 'rest')".
      const rpcBook = (fn: string, args: Record<string, unknown>) =>
        (supabase as unknown as {
          rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: string | null; error: { message: string } | null }>
        }).rpc(fn, args)
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
      const { data: bookingId, error } = res
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
      // Online card payment: the booking exists (unpaid) — start the bank flow via
      // the bank-pay edge fn. Mock (test-mode org) settles instantly; a real
      // provider returns the bank's redirect URL and we leave the page.
      if (pay === 'card' && bookingId) {
        const { data: payRes } = await supabase.functions
          .invoke('bank-pay', { body: { action: 'create_booking_payment', booking_id: bookingId } })
          .catch(() => ({ data: null }))
        const pr = payRes as { ok?: boolean; mock?: boolean; paid?: boolean; redirect_url?: string } | null
        if (pr?.redirect_url) {
          window.location.assign(pr.redirect_url)
          return // navigating to the bank — keep the button in its loading state
        }
        if (pr?.ok && pr.mock && pr.paid) {
          setPayNote('💳 გადახდილია — ჯავშანი დადასტურდა ✅ (ტესტ-რეჟიმი)')
        } else {
          setPayNote('⚠️ ბარათით გადახდა ვერ დაიწყო — ჯავშანი შენახულია, გადაიხდი ადგილზე.')
        }
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

  const isStep2 = pick != null && !done;

  return (
    <div className="nm-raised rounded-3xl p-5 sm:p-6 relative overflow-hidden transition-[height] duration-300">
      {/* STEP 1: Select Type, Date, Time (Timeline) */}
      {!isStep2 && !done && (
        <div className="animate-in-up">
          {/* Resource-type selector (only if the venue has more than one type) */}
          {types.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {types.map((t) => (
                <button
                  key={t.console_type}
                  onClick={() => {
                    setSelType(t.console_type)
                    setPick(null)
                  }}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-transform duration-200 active:scale-[0.97] ${selType === t.console_type ? 'nm-glow' : 'nm-btn'}`}
                >
                  {typeLabel(t.console_type)}{' '}
                  <span className="text-xs text-[var(--muted-foreground)] opacity-80">×{t.capacity}</span>
                </button>
              ))}
            </div>
          )}

          {/* Date selector */}
          <div className="flex gap-2.5 overflow-x-auto pb-4 no-scrollbar">
            {dates.map((d, i) => {
              const { dow, day } = dayLabel(d)
              return (
                <button
                  key={i}
                  onClick={() => setSelDate(i)}
                  className={`shrink-0 rounded-2xl px-4 py-2.5 text-center transition-all duration-200 active:scale-[0.97] ${i === selDate ? 'nm-glow border-[var(--primary)]/30' : 'nm-btn'}`}
                >
                  <div className={`text-[10px] font-medium uppercase tracking-widest ${i === selDate ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}>{dow}</div>
                  <div className="font-bold text-lg mt-0.5">{day}</div>
                </button>
              )
            })}
          </div>

          {/* Free-slot timeline */}
          {loading ? (
            <div className="py-12 text-center text-sm font-medium animate-pulse text-[var(--muted-foreground)]">მონაცემები იტვირთება...</div>
          ) : capacity === 0 ? (
            <div className="py-12 text-center text-sm font-medium text-[var(--muted-foreground)]">{isBilliard(selType) ? 'მაგიდები' : 'კონსოლები'} არ მოიძებნა.</div>
          ) : (
            <div className="mt-2">
              <div className="flex gap-1">
                {HOURS.map((h) => {
                  const free = freeAt(h)
                  const past = isPast(h)
                  const nowCell = isNowCell(h)
                  const disabled = past || free === 0
                  return (
                    <button
                      key={h}
                      disabled={disabled}
                      onClick={() => setPick(h)}
                      title={nowCell ? `ახლავე — ${free} თავისუფალი` : `${h}:00 — ${free} თავისუფალი`}
                      className={`flex h-14 flex-1 flex-col items-center justify-center rounded-xl text-xs transition-all duration-200 active:scale-[0.85] ${
                        past
                          ? 'bg-[var(--surface)] opacity-30 shadow-inner'
                          : free === 0
                            ? 'bg-[var(--status-busy)]/80 text-white shadow-inner'
                            : nowCell
                              ? 'bg-[var(--primary)]/20 ring-1 ring-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/30'
                              : 'bg-[var(--status-free)]/20 hover:bg-[var(--status-free)]/40 hover:scale-[1.05]'
                      }`}
                    >
                      <span className="font-black text-sm">{past ? '·' : nowCell ? '⚡' : free}</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-1.5 flex gap-1 text-[10px] font-medium text-[var(--muted-foreground)]">
                {HOURS.map((h) => (
                  <div key={h} className="flex-1 text-center">
                    {h % 2 === 0 ? h : ''}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <p>ციფრი = თავისუფალი {typeLabel(selType)}-ის რაოდენობა.</p>
                {HOURS.some((h) => isNowCell(h) && freeAt(h) > 0) && <p className="text-[var(--primary)]">⚡ = გელოდებათ ახლავე.</p>}
              </div>
              {selDate === 0 && HOURS.every((h) => isPast(h) || freeAt(h) === 0) && (
                <p className="mt-3 rounded-xl bg-[var(--surface)] px-4 py-2.5 text-xs text-center text-[var(--muted-foreground)] shadow-inner">
                  🌙 ონლაინ საათები ამოიწურა ან დაკავებულია. გთხოვთ აირჩიოთ ხვალინდელი დღე.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* DONE STATE */}
      {done && (
        <div className="animate-in-up text-center py-8 relative">
           {/* Success glow behind */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[var(--status-free)] rounded-full blur-[60px] opacity-20 pointer-events-none"></div>
           
           <div className="inline-flex items-center justify-center size-16 rounded-full bg-[var(--status-free)]/20 text-[var(--status-free)] mb-4 ring-1 ring-[var(--status-free)]/50">
             <span className="text-3xl relative top-px block animate-bounce" style={{ animationIterationCount: 2 }}>✓</span>
           </div>
           <p className="font-black text-2xl mb-2 text-glow">ჯავშანი მიღებულია!</p>
           <p className="text-sm text-[var(--muted-foreground)] px-4 mx-auto max-w-xs">
             {payNote ?? 'კლუბის ადმინისტრაცია დაგიკავშირდებათ დასადასტურებლად წუთ-წუთზე.'}
           </p>
           <div className="mt-8 flex gap-3 justify-center">
             <button onClick={() => { setDone(false); loadAvailability(); }} className="nm-btn rounded-xl px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 active:scale-95">ახალი ჯავშანი</button>
             <a href="/account" className="nm-glow neon-border rounded-xl px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 active:scale-95">ჩემი ჯავშნები</a>
           </div>
        </div>
      )}

      {/* STEP 2: Booking Details Form (Progressive Disclosure) */}
      {isStep2 && (
        <div className="space-y-5 animate-in-up">
          
          {/* Header & Back Button */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
             <button title="უკან" onClick={() => setPick(null)} className="flex items-center gap-1.5 font-medium text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors text-sm pr-4 py-1 group">
               <span className="transition-transform group-hover:-translate-x-1">←</span> უკან დაბრუნება
             </button>
             <div className="text-right leading-tight">
               <span className="block font-black text-lg text-[var(--primary)]">{pick !== null && isNowCell(pick) ? '⚡ ახლავე' : `${pick}:00`}</span>
               <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">{toISODate(dates[selDate])} · {typeLabel(selType)}</span>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Duration Section */}
            <div>
              <div className="mb-2 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">ხანგრძლივობა</div>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${duration === d ? 'nm-glow text-[var(--primary-foreground)]' : 'nm-inset hover:bg-[var(--surface-2)] text-[var(--foreground)]'}`}
                  >
                    {d % 60 === 0 ? `${d / 60} სთ` : `${Math.floor(d / 60)}:${d % 60}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Consoles Section (Dropdown) */}
            {freeConsoles.length > 1 && (
              <div>
                <div className="mb-2 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                  აირჩიე {isBilliard(selType) ? 'მაგიდა' : 'კონსოლი'}
                </div>
                <div className="relative group">
                   <select 
                     className="w-full nm-inset rounded-xl px-4 py-2.5 text-sm outline-none appearance-none font-medium cursor-pointer transition-colors focus:ring-1 focus:ring-[var(--primary)] hover:bg-[var(--surface-2)]"
                     onChange={(e) => setPickedConsole(e.target.value === 'any' ? null : Number(e.target.value))}
                     value={pickedConsole === null ? 'any' : pickedConsole.toString()}
                   >
                     <option value="any">✨ ნებისმიერი ({freeConsoles.length} თავისუფალი)</option>
                     {freeConsoles.map(c => <option key={c.console_id} value={c.console_id.toString()}>{c.name}</option>)}
                   </select>
                   <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                   </div>
                </div>
              </div>
            )}
          </div>

           {/* Tariffs (Bento-style list) */}
          {shownPlans.length > 0 && (
            <div className="pt-1">
              <div className="mb-2 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">ტარიფი</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {shownPlans.map((p) => (
                  <button
                    key={p.plan_id}
                    onClick={() => setPlanId(p.plan_id)}
                    className={`rounded-2xl px-4 py-3 text-left transition-all duration-200 active:scale-[0.98] flex justify-between items-center ${planId === p.plan_id ? 'nm-glow ring-1 ring-[var(--primary)]' : 'nm-inset hover:bg-[var(--surface-2)] shadow-inner'}`}
                  >
                    <div>
                      <div className="font-bold text-sm tracking-tight">{p.name}</div>
                      <div className="text-[10px] mt-0.5 opacity-60 font-medium">
                        {isBilliard(selType) ? 'ბილიარდის ტარიფი' : `${p.controllers} ჯოისტიკი`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-[var(--primary)] text-sm">{gel(p.price_per_hour)}<span className="text-[10px] font-medium opacity-60">/სთ</span></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Details (Name/phone) */}
          <div className="pt-2">
             <div className="mb-2 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">საკონტაქტო ინფო</div>
             <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1.2fr]">
               <input value={name} onChange={(e) => setName(e.target.value)} placeholder="სახელი და გვარი" className="nm-inset w-full rounded-2xl px-4 py-3 text-sm font-medium outline-none transition-all placeholder:text-[var(--muted-foreground)]/50 focus:bg-[var(--surface)] focus:ring-1 focus:ring-[var(--primary)]/30" />
               <div className="relative">
                 <input
                   value={phone}
                   onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s]/g, ''))}
                   placeholder="ტელეფონი (5XX XX XX XX)"
                   type="tel"
                   inputMode="tel"
                   maxLength={16}
                   className={`nm-inset w-full rounded-2xl px-4 py-3 text-sm font-medium outline-none transition-all placeholder:text-[var(--muted-foreground)]/50 focus:bg-[var(--surface)] ${phone.trim() && !phoneValid ? 'ring-1 ring-[var(--status-busy)]' : 'focus:ring-1 focus:ring-[var(--primary)]/30'}`}
                 />
                 {phone.trim() && !phoneValid && (
                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--status-busy)] uppercase tracking-wider bg-[var(--surface)] px-1 rounded">მცდარია</span>
                 )}
               </div>
             </div>
          </div>

          {/* Payment */}
          <div className="pt-1 border-t border-[var(--border)] mt-2">
            <div className="mb-2 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider pt-2">გადახდის მეთოდი</div>
            <div className="flex flex-wrap gap-2.5">
              {[
                { id: 'transfer', label: 'გადარიცხვა' },
                { id: 'cash_on_arrival', label: 'ადგილზე' },
              ].map((m) => (
                <button 
                  key={m.id} 
                  onClick={() => setPay(m.id as 'transfer' | 'cash_on_arrival' | 'card')} 
                  className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.97] ${pay === m.id ? 'nm-glow text-[var(--primary)]' : 'nm-inset hover:bg-[var(--surface-2)] shadow-inner'}`}
                >
                  {m.label}
                </button>
              ))}
              {cardPay?.available ? (
                <button 
                  onClick={() => setPay('card')} 
                  className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.97] ${pay === 'card' ? 'nm-glow text-[var(--primary)]' : 'nm-inset hover:bg-[var(--surface-2)] shadow-inner'}`}
                >
                  💳 ბარათით{cardPay.mock ? ' (ტესტ)' : ''}
                </button>
              ) : (
                <button disabled title="მალე" className="nm-inset cursor-not-allowed rounded-xl px-4 py-2.5 text-xs font-bold opacity-30 shadow-inner">💳 ბარათით (მალე)</button>
              )}
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="pt-6 mt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest font-bold mb-0.5">სულ გადასახდელი</div>
              <div className="text-3xl font-black text-glow text-[var(--primary)] tabular-nums">{gel(total)}</div>
            </div>
            <button
              onClick={submit}
              disabled={submitting || (authed && (!name.trim() || !phoneValid))}
              className="nm-glow neon-border flex items-center justify-center gap-2 rounded-2xl w-full sm:w-auto px-8 py-4 font-black transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide text-sm group"
            >
              {submitting ? 'მუშავდება...' : authed ? 'დავადასტუროთ ჯავშანი' : 'შესვლა და დაჯავშნა'}
              {!submitting && <span className="transition-transform group-hover:translate-x-1 inline-block">→</span>}
            </button>
          </div>

          {error && <div className="rounded-xl bg-[var(--status-busy)]/10 px-4 py-3 text-center text-sm font-semibold text-[var(--status-busy)] animate-in-up">{error}</div>}
        </div>
      )}
    </div>
  )
}

