'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Ticket, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Online registration island embedded on a tournament card (registration status only).
// Auth-gated; on success the entry fee is paid AT THE VENUE on QR check-in (pay-at-venue).
export function TournamentRegister({
  tournamentId,
  entryFee,
}: {
  tournamentId: string
  entryFee: number | null
}) {
  const [state, setState] = useState<'idle' | 'form' | 'loading' | 'done' | 'auth'>('idle')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState('')

  const open = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setState('auth')
      return
    }
    const { data } = await supabase
      .from('marketplace_customers')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle()
    if (data) {
      setName(((data as { full_name: string | null }).full_name) ?? '')
      setPhone(((data as { phone: string | null }).phone) ?? '')
    }
    setState('form')
  }

  const submit = async () => {
    if (!name.trim()) {
      setErr('შეიყვანე სახელი')
      return
    }
    setState('loading')
    setErr('')
    const supabase = createClient()
    const { error } = await (supabase.rpc as unknown as (
      f: string,
      a: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>)('register_for_tournament', {
      p_tournament: tournamentId,
      p_name: name.trim(),
      p_phone: phone.trim(),
    })
    if (error) {
      const m = /registration_closed/.test(error.message)
        ? 'რეგისტრაცია დახურულია'
        : /tournament_full/.test(error.message)
          ? 'ადგილები შეივსო'
          : /not_authenticated/.test(error.message)
            ? 'ჯერ შედი სისტემაში'
            : error.message
      setErr(m)
      setState('form')
      return
    }
    setState('done')
  }

  if (state === 'done')
    return (
      <div className="nm-inset rounded-xl px-4 py-3 text-center text-sm">
        ✅ დარეგისტრირდი!{' '}
        <Link href="/account" className="font-bold text-[var(--primary)] underline">
          QR ბილეთი →
        </Link>
      </div>
    )

  if (state === 'auth')
    return (
      <Link
        href="/auth/login"
        className="nm-btn block rounded-xl px-4 py-2.5 text-center text-sm font-bold text-[var(--primary)]"
      >
        შესვლა რეგისტრაციისთვის
      </Link>
    )

  if (state === 'form' || state === 'loading')
    return (
      <div className="nm-inset space-y-2 rounded-xl p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="სახელი / ნიკი"
          className="nm-inset w-full rounded-lg px-3 py-2 text-sm outline-none"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="ტელეფონი"
          className="nm-inset w-full rounded-lg px-3 py-2 text-sm outline-none"
        />
        {err && <p className="text-xs text-red-400">{err}</p>}
        <button
          onClick={submit}
          disabled={state === 'loading'}
          className="nm-btn flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-[var(--primary)] disabled:opacity-50"
        >
          {state === 'loading' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>დადასტურება{entryFee ? ` · საწევრო ${entryFee}₾ ადგილზე` : ''}</>
          )}
        </button>
      </div>
    )

  return (
    <button
      onClick={open}
      className="nm-btn flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--primary)]"
    >
      <Ticket className="size-4" /> დარეგისტრირდი
    </button>
  )
}
