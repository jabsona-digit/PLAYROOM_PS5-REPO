'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const router = useRouter()
  async function signOut() {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }
  return (
    <button
      onClick={signOut}
      title="გასვლა"
      className="nm-btn p-2 rounded-xl"
      aria-label="გასვლა"
    >
      <LogOut className="size-4" />
    </button>
  )
}
