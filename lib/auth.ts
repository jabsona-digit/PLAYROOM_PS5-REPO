import { createClient } from '@/lib/supabase/server'

// Current signed-in user (or null) — for server components / pages.
export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
