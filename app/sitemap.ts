import type { MetadataRoute } from 'next'
import { createPublicClient } from '@/lib/supabase/public'

const BASE = 'https://play.martelounge.ge'

// Canonical URLs only — home, the listing, and every published venue. Bots that
// honor the sitemap crawl these (not infinite ?q= combos). Cached 1h so repeated
// sitemap fetches don't keep hitting Supabase.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  let venues: { slug: string | null }[] = []
  try {
    const supabase = createPublicClient()
    const { data } = await supabase.from('public_venues').select('slug').limit(2000)
    venues = data ?? []
  } catch {
    /* if Supabase is unreachable, still return the static routes */
  }

  const venueUrls: MetadataRoute.Sitemap = venues
    .filter((v) => v.slug)
    .map((v) => ({
      url: `${BASE}/${v.slug}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    }))

  return [
    { url: BASE, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/venues`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...venueUrls,
  ]
}
