import { notFound } from 'next/navigation'
import { Star, MapPin, Phone, Check } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/public'
import { BookingWidget, type Plan } from '@/components/booking-widget'
import { gel } from '@/lib/utils'
import type { Database } from '@/lib/database.types'
import { ScrollReveal } from '@/components/scroll-reveal'

// ISR: cache the venue profile for 1h (profile/reviews change slowly). Live
// availability is fetched client-side by BookingWidget, so caching the shell is
// safe. Public reads only (no cookies) → CDN-cacheable, shields Supabase.
export const revalidate = 3600

type PublicVenue = Database['public']['Views']['public_venues']['Row']
type PublicReview = Database['public']['Views']['public_reviews']['Row']

// Prerender every published venue at build → they become ISR-cached pages
// (new venues not yet built still render on-demand and then cache).
export async function generateStaticParams() {
  try {
    const supabase = createPublicClient()
    const { data } = await supabase.from('public_venues').select('slug').limit(500)
    return (data ?? [])
      .filter((v) => v.slug)
      .map((v) => ({ slug: v.slug as string }))
  } catch {
    return []
  }
}

async function getVenue(slug: string) {
  const supabase = createPublicClient()
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

  const supabase = createPublicClient()
  const [{ data: reviewsRaw }, { data: plansRaw }] = await Promise.all([
    supabase
      .from('public_reviews')
      .select('*')
      .eq('venue_id', venue.id!)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('public_venue_plans').select('*').eq('venue_slug', decoded),
  ])
  const reviews = (reviewsRaw ?? []) as PublicReview[]
  const plans = (plansRaw ?? []) as Plan[]

  const amenities = Array.isArray(venue.amenities) ? (venue.amenities as string[]) : []

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-12">
      {/* Cover - Disabled ScrollReveal for LCP safety */}
      <ScrollReveal disabled>
        <div className="relative aspect-[21/9] rounded-3xl overflow-hidden nm-raised group">
          {venue.cover_image_url ? (
            // LCP Safe: standard img triggers metrics immediately.
            // Slow pan effect on group-hover fakes a weak parallax without forcing JS listeners.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={venue.cover_image_url}
              alt={venue.name ?? ''}
              className="h-full w-full object-cover transition-transform duration-[4s] ease-out group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-7xl opacity-20">
              🎮
            </div>
          )}
        </div>
      </ScrollReveal>

      <div className="mt-6 flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column */}
        <div className="flex-1 min-w-0">
          <ScrollReveal disabled>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-glow">{venue.name}</h1>
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
                      className="flex items-center gap-1.5 hover:text-[var(--primary)] transition-colors"
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
              <p className="mt-6 text-[var(--muted-foreground)] leading-relaxed">
                {venue.description}
              </p>
            )}

            {amenities.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {amenities.map((a) => (
                  <span
                    key={a}
                    className="nm-inset rounded-full px-4 py-2 text-sm flex items-center gap-2 hover:neon-border transition-colors cursor-default"
                  >
                    <Check className="size-3.5 text-[var(--primary)]" />
                    {a}
                  </span>
                ))}
              </div>
            )}
          </ScrollReveal>

          {/* Reviews */}
          <ScrollReveal delayMs={100}>
            <section className="mt-12">
              <h2 className="text-xl font-bold mb-4">შეფასებები</h2>
              {reviews.length === 0 ? (
                <div className="nm-inset rounded-2xl p-6 text-center text-sm text-[var(--muted-foreground)]">
                  ჯერ შეფასება არ არის.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r, i) => (
                    <ScrollReveal key={r.id} delayMs={i * 50}>
                      <div className="nm-raised-sm rounded-2xl p-5 hover:-translate-y-0.5 transition-transform">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{r.author}</span>
                          <span className="flex items-center gap-0.5 text-[var(--primary)]">
                            {Array.from({ length: r.rating ?? 0 }).map((_, i) => (
                              <Star key={i} className="size-3.5 fill-current" />
                            ))}
                          </span>
                        </div>
                        {r.comment && <p className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed">{r.comment}</p>}
                        {r.reply && (
                          <div className="mt-3 ml-3 pl-3 border-l-2 border-[var(--primary)]/40 text-sm text-[var(--muted-foreground)] bg-[var(--surface-2)] p-2 rounded-lg">
                            <span className="font-medium text-[var(--foreground)] block mb-0.5">
                              პასუხი:{' '}
                            </span>
                            {r.reply}
                          </div>
                        )}
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              )}
            </section>
          </ScrollReveal>
        </div>

        {/* Right Column: Responsive Booking Section */}
        <div className="w-full lg:w-[380px] shrink-0 lg:sticky lg:top-24 lg:z-20">
          <ScrollReveal disabled>
            <div className="lg:nm-raised lg:rounded-3xl lg:p-6 mt-10 lg:mt-0">
              <h2 className="flex items-center gap-2 text-xl font-bold mb-4 text-glow">
                 <span className="flex size-2"><span className="absolute inline-flex size-2 animate-ping rounded-full bg-[var(--primary)] opacity-70" /><span className="relative inline-flex size-2 rounded-full bg-[var(--primary)]" /></span>
                 დაჯავშნა
              </h2>
              
              <BookingWidget slug={decoded} plans={plans} />
              
              <p className="hidden lg:block mt-4 text-xs text-[var(--muted-foreground)] text-center">
                აირჩიე თარიღი და თავისუფალი დრო, შეავსე ჯავშნის დეტალები.
              </p>
            </div>
          </ScrollReveal>
        </div>

      </div>
    </div>
  )
}
