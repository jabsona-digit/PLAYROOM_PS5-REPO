import { notFound } from 'next/navigation'
import { Star, MapPin, Phone, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { BookingWidget, type Plan } from '@/components/booking-widget'
import { gel } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

type PublicVenue = Database['public']['Views']['public_venues']['Row']
type PublicReview = Database['public']['Views']['public_reviews']['Row']

async function getVenue(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('public_venues')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  return data as PublicVenue | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const venue = await getVenue(decodeURIComponent(slug))
  if (!venue) return { title: 'კლუბი ვერ მოიძებნა', robots: { index: false, follow: false } }
  const description =
    venue.description ??
    `დაჯავშნე PlayStation კონსოლი — ${venue.name}${venue.city ? `, ${venue.city}` : ''}.`
  const canonical = `/${slug}`
  return {
    title: venue.name ?? 'კლუბი',
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title: venue.name ?? 'კლუბი',
      description,
      images: venue.cover_image_url ? [{ url: venue.cover_image_url }] : undefined,
    },
  }
}

export default async function VenuePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const venue = await getVenue(decoded)
  if (!venue) notFound()

  const supabase = await createClient()
  const [{ data: reviewsRaw }, { data: plansRaw }, user] = await Promise.all([
    supabase
      .from('public_reviews')
      .select('*')
      .eq('venue_id', venue.id!)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('public_venue_plans').select('*').eq('venue_slug', decoded),
    getUser(),
  ])
  const reviews = (reviewsRaw ?? []) as PublicReview[]
  const plans = (plansRaw ?? []) as Plan[]

  const amenities = Array.isArray(venue.amenities) ? (venue.amenities as string[]) : []

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Cover */}
      <div className="relative aspect-[21/9] rounded-3xl overflow-hidden nm-raised">
        {venue.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={venue.cover_image_url}
            alt={venue.name ?? ''}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-7xl opacity-20">
            🎮
          </div>
        )}
      </div>

      {/* Header */}
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{venue.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted-foreground)]">
            {(venue.city || venue.address) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {[venue.city, venue.address].filter(Boolean).join(', ')}
              </span>
            )}
            {venue.public_phone && (
              <a
                href={`tel:${venue.public_phone}`}
                className="flex items-center gap-1.5 hover:text-[var(--primary)]"
              >
                <Phone className="size-4" />
                {venue.public_phone}
              </a>
            )}
            {Number(venue.avg_rating) > 0 && (
              <span className="flex items-center gap-1.5">
                <Star className="size-4 fill-[var(--primary)] text-[var(--primary)]" />
                <span className="font-semibold text-[var(--foreground)]">
                  {Number(venue.avg_rating).toFixed(1)}
                </span>
                ({venue.review_count})
              </span>
            )}
          </div>
        </div>
        {venue.price_from != null && (
          <div className="nm-raised-sm rounded-2xl px-5 py-3 text-right">
            <div className="text-xs text-[var(--muted-foreground)]">დან</div>
            <div className="text-xl font-bold text-[var(--primary)]">
              {gel(venue.price_from)}
              <span className="text-sm font-normal text-[var(--muted-foreground)]">
                {' '}
                / სთ
              </span>
            </div>
          </div>
        )}
      </div>

      {venue.description && (
        <p className="mt-4 text-[var(--muted-foreground)] leading-relaxed">
          {venue.description}
        </p>
      )}

      {amenities.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {amenities.map((a) => (
            <span
              key={a}
              className="nm-raised-sm rounded-full px-3 py-1.5 text-sm flex items-center gap-1.5"
            >
              <Check className="size-3.5 text-[var(--primary)]" />
              {a}
            </span>
          ))}
        </div>
      )}

      {/* Availability + booking */}
      <section className="mt-8">
        <h2 className="text-xl font-bold mb-3">დაჯავშნა</h2>
        <BookingWidget
          slug={decoded}
          plans={plans}
          isAuthed={!!user}
          defaultName={(user?.user_metadata?.full_name as string) ?? ''}
          defaultPhone={(user?.user_metadata?.phone as string) ?? ''}
        />
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
          აირჩიე თარიღი და თავისუფალი დრო, შემდეგ შეავსე ჯავშნის დეტალები.
        </p>
      </section>

      {/* Reviews */}
      <section className="mt-10">
        <h2 className="text-xl font-bold mb-3">შეფასებები</h2>
        {reviews.length === 0 ? (
          <div className="nm-inset rounded-2xl p-6 text-center text-sm text-[var(--muted-foreground)]">
            ჯერ შეფასება არ არის.
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="nm-raised-sm rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{r.author}</span>
                  <span className="flex items-center gap-0.5 text-[var(--primary)]">
                    {Array.from({ length: r.rating ?? 0 }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-current" />
                    ))}
                  </span>
                </div>
                {r.comment && <p className="mt-1.5 text-sm">{r.comment}</p>}
                {r.reply && (
                  <div className="mt-2 ml-3 pl-3 border-l-2 border-[var(--primary)]/40 text-sm text-[var(--muted-foreground)]">
                    <span className="font-medium text-[var(--foreground)]">
                      პასუხი:{' '}
                    </span>
                    {r.reply}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
