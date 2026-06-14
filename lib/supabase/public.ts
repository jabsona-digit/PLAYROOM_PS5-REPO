import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Cookie-less anon client for PUBLIC reads (public_venues / public_reviews /
// public_venue_plans). Because it never calls cookies(), pages that use it can be
// statically/ISR-cached — so bots and repeat visits serve from the Cloudflare CDN
// instead of hitting Supabase on every request. NEVER use for per-user data.
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
