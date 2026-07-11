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

      <div className="mt-10 flex flex-col gap-12">
        {/* Venue Header (Full Width) */}
        <ScrollReveal disabled>
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-4xl font-black text-glow tracking-tight">{venue.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--muted-foreground)] font-medium">
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
                    <span className="font-bold text-[var(--foreground)]">
                      {Number(venue.avg_rating).toFixed(1)}
                    </span>
                    ({venue.review_count})
                  </span>
                )}
              </div>
              {venue.description && (
                <p className="mt-5 max-w-3xl text-[var(--muted-foreground)] leading-relaxed text-sm sm:text-base">
                  {venue.description}
                </p>
              )}
              {amenities.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {amenities.map((a) => (
                    <span
                      key={a}
                      className="nm-inset rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-1.5 hover:neon-border transition-colors cursor-default"
                    >
                      <Check className="size-3.5 text-[var(--primary)]" />
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {venue.price_from != null && (
              <div className="nm-raised rounded-3xl px-8 py-5 text-right shrink-0 min-w-[200px]">
                <div className="text-xs text-[var(--muted-foreground)] font-bold uppercase tracking-widest mb-1">ფასი იწყება</div>
                <div className="text-3xl font-black text-[var(--primary)]">
                  {gel(venue.price_from)}
                  <span className="text-sm font-medium text-[var(--muted-foreground)] opacity-60">
                    {' '}
                    / სთ
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Booking Section (Full Width, immersive) */}
        <ScrollReveal disabled>
          <section className="relative">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
               <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight text-glow">
                  <span className="flex size-2.5"><span className="absolute inline-flex size-2.5 animate-ping rounded-full bg-[var(--primary)] opacity-70" /><span className="relative inline-flex size-2.5 rounded-full bg-[var(--primary)]" /></span>
                  ონლაინ დაჯავშნა
               </h2>
               <span className="text-sm font-medium text-[var(--muted-foreground)] hidden sm:block">აირჩიე თარიღი და თავისუფალი დრო</span>
             </div>
             
             {/* The widget internally will spread out in this full-width container */}
             <div className="max-w-4xl mx-auto w-full">
               <BookingWidget slug={decoded} plans={plans} />
             </div>
          </section>
        </ScrollReveal>

        {/* Reviews Section */}
        <ScrollReveal delayMs={100}>
          <section>
            <h2 className="text-2xl font-black mb-6">შეფასებები</h2>
            {reviews.length === 0 ? (
              <div className="nm-inset rounded-3xl p-8 text-center text-[var(--muted-foreground)]">
                ჯერ შეფასება არ არის.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {reviews.map((r, i) => (
                  <ScrollReveal key={r.id} delayMs={i * 50}>
                    <div className="nm-raised-sm rounded-3xl p-6 h-full flex flex-col hover:-translate-y-1 transition-transform duration-300 block">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-lg">{r.author}</span>
                        <span className="flex items-center gap-0.5 text-[var(--primary)]">
                          {Array.from({ length: r.rating ?? 0 }).map((_, i) => (
                            <Star key={i} className="size-4 fill-current" />
                          ))}
                        </span>
                      </div>
                      {r.comment && <p className="text-sm text-[var(--muted-foreground)] leading-relaxed flex-1">{r.comment}</p>}
                      {r.reply && (
                        <div className="mt-4 ml-4 pl-4 border-l-2 border-[var(--primary)]/40 text-sm text-[var(--muted-foreground)] bg-[var(--surface-2)] p-3 rounded-xl">
                          <span className="font-bold text-[var(--foreground)] block mb-1 text-xs uppercase tracking-wider">
                            კლუბის პასუხი
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
    </div>
  )
}
