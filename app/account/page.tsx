import Link from 'next/link'
import { Calendar, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { gel } from '@/lib/utils'
import { BookingReview } from '@/components/booking-review'
import { BookingPass } from '@/components/booking-pass'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'ჩემი ჯავშნები' }

type Booking = Database['public']['Tables']['marketplace_bookings']['Row']

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'მოლოდინში', cls: 'text-amber-400' },
  confirmed: { label: 'დადასტურებული', cls: 'text-[var(--status-free)]' },
  cancelled: { label: 'გაუქმებული', cls: 'text-[var(--status-busy)]' },
  completed: { label: 'დასრულებული', cls: 'text-[var(--muted-foreground)]' },
  no_show: { label: 'არ მოვიდა', cls: 'text-[var(--status-busy)]' },
}
const PAYMENT: Record<string, string> = {
  unpaid: 'გადაუხდელი',
  deposit_paid: 'დეპოზიტი გადახდილია',
  paid: 'გადახდილი',
  refunded: 'დაბრუნებული',
}

function fmt(ts: string) {
  const d = new Date(ts)
  return {
    date: d.toLocaleDateString('ka-GE', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' }),
  }
}

export default async function AccountPage() {
  const user = await getUser()

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">ჩემი ჯავშნები</h1>
        <p className="mt-3 text-[var(--muted-foreground)]">
          ჯავშნების სანახავად გაიარე ავტორიზაცია.
        </p>
        <Link
          href="/auth/login?next=/account"
          className="nm-glow inline-block mt-6 rounded-xl px-6 py-3 font-semibold"
        >
          შესვლა
        </Link>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: bookingsRaw } = await supabase
    .from('marketplace_bookings')
    .select('*')
    .eq('customer_id', user.id)
    .order('start_time', { ascending: false })
  const bookings = (bookingsRaw ?? []) as Booking[]

  // venue names (public_venues is anon-readable)
  const venueIds = [...new Set(bookings.map((b) => b.venue_id))]
  const venueMap = new Map<string, { slug: string; name: string }>()
  if (venueIds.length) {
    const { data: venues } = await supabase
      .from('public_venues')
      .select('id, slug, name')
      .in('id', venueIds)
    for (const v of venues ?? []) {
      if (v.id) venueMap.set(v.id, { slug: v.slug ?? '', name: v.name ?? 'კლუბი' })
    }
  }

  // existing reviews (to prefill / mark already-reviewed bookings)
  const { data: myReviews } = await supabase
    .from('marketplace_reviews')
    .select('booking_id, rating, comment')
    .eq('customer_id', user.id)
  const reviewMap = new Map<string, { rating: number; comment: string | null }>()
  for (const r of myReviews ?? []) {
    if (r.booking_id) reviewMap.set(r.booking_id, { rating: r.rating, comment: r.comment })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">ჩემი ჯავშნები</h1>

      {bookings.length === 0 ? (
        <div className="nm-inset rounded-2xl p-10 text-center text-[var(--muted-foreground)]">
          ჯერ ჯავშანი არ გაქვს.{' '}
          <Link href="/venues" className="text-[var(--primary)]">
            ნახე კლუბები →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const v = venueMap.get(b.venue_id)
            const s = STATUS[b.status] ?? { label: b.status, cls: '' }
            const { date, time } = fmt(b.start_time)
            return (
              <div key={b.id} className="nm-raised-sm rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {v ? (
                      <Link href={`/${v.slug}`} className="font-bold hover:text-[var(--primary)]">
                        {v.name}
                      </Link>
                    ) : (
                      <span className="font-bold">კლუბი</span>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted-foreground)]">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3.5" /> {date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5" /> {time} · {b.duration_min} წთ
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-semibold ${s.cls}`}>{s.label}</div>
                    <div className="mt-1 text-sm font-bold text-[var(--primary)]">
                      {gel(b.total_amount)}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {PAYMENT[b.payment_status] ?? b.payment_status}
                    </div>
                  </div>
                </div>

                {(b.status === 'pending' || b.status === 'confirmed') && (
                  <BookingPass bookingId={b.id} />
                )}
                {b.status === 'completed' && (
                  <BookingReview
                    bookingId={b.id}
                    initialRating={reviewMap.get(b.id)?.rating}
                    initialComment={reviewMap.get(b.id)?.comment ?? undefined}
                    reviewed={reviewMap.has(b.id)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
