import type { MetadataRoute } from 'next'

const BASE = 'https://play.martelounge.ge'

// Bot-safe by design: index the public pages, but
// - block crawling of ANY query-string URL (e.g. /venues?q=…) so bots can't
//   explode the crawl space into infinite param combinations (the Kale lesson),
// - block private/auth areas,
// - block heavy AI scrapers that bring traffic cost but no SEO value.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/account', '/auth/', '/*?'],
      },
      {
        userAgent: [
          'GPTBot', 'CCBot', 'ClaudeBot', 'anthropic-ai', 'Claude-Web',
          'Google-Extended', 'PerplexityBot', 'Bytespider', 'Amazonbot', 'Applebot-Extended',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}
