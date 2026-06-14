'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SignOutButton } from './sign-out-button'

// Header auth state, resolved CLIENT-side so the server layout never reads
// cookies() — which keeps the public pages statically/ISR-cacheable. Logged-out
// is the default (matches the cached HTML); it hydrates to the account view if a
// session exists.
export function HeaderAuth() {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (authed) {
    return (
      <>
        <Link href="/account" className="nm-btn px-4 py-2 rounded-xl text-sm font-medium">
          ჩემი ჯავშნები
        </Link>
        <SignOutButton />
      </>
    )
  }

  return (
    <Link href="/auth/login" className="nm-btn px-4 py-2 rounded-xl text-sm font-medium">
      შესვლა
    </Link>
  )
}
