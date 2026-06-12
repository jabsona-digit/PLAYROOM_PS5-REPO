'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/account'

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const isRegister = mode === 'register'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    const supabase = createClient()

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, phone } },
        })
        if (error) throw error

        if (data.session && data.user) {
          await supabase.from('marketplace_customers').upsert({
            id: data.user.id,
            full_name: fullName,
            phone,
          })
          router.push(next)
          router.refresh()
        } else {
          setInfo('ანგარიში შეიქმნა. გთხოვ, დაადასტურე ელ. ფოსტა და შემდეგ შედი.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        // make sure a customer profile row exists
        if (data.user) {
          await supabase
            .from('marketplace_customers')
            .upsert(
              {
                id: data.user.id,
                full_name:
                  (data.user.user_metadata?.full_name as string) || email.split('@')[0],
                phone: (data.user.user_metadata?.phone as string) || null,
              },
              { onConflict: 'id', ignoreDuplicates: true },
            )
        }
        router.push(next)
        router.refresh()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'დაფიქსირდა შეცდომა'
      setError(
        /invalid login/i.test(msg)
          ? 'ელ. ფოსტა ან პაროლი არასწორია'
          : /already registered/i.test(msg)
            ? 'ეს ელ. ფოსტა უკვე დარეგისტრირებულია'
            : /password/i.test(msg)
              ? 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს'
              : msg,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="nm-raised rounded-3xl p-6 sm:p-8 animate-in-up">
        <h1 className="text-2xl font-bold text-center">
          {isRegister ? 'რეგისტრაცია' : 'შესვლა'}
        </h1>
        <p className="mt-1 text-center text-sm text-[var(--muted-foreground)]">
          {isRegister
            ? 'შექმენი ანგარიში და დაჯავშნე კონსოლი'
            : 'შედი შენს ანგარიშზე'}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          {isRegister && (
            <>
              <Field
                label="სახელი და გვარი"
                value={fullName}
                onChange={setFullName}
                required
                placeholder="გიორგი ბერიძე"
              />
              <Field
                label="ტელეფონი"
                value={phone}
                onChange={setPhone}
                required
                type="tel"
                placeholder="+995 5XX XX XX XX"
              />
            </>
          )}
          <Field
            label="ელ. ფოსტა"
            value={email}
            onChange={setEmail}
            required
            type="email"
            placeholder="you@example.com"
          />
          <Field
            label="პაროლი"
            value={password}
            onChange={setPassword}
            required
            type="password"
            placeholder="••••••••"
          />

          {error && (
            <p className="text-sm text-[var(--status-busy)] text-center">{error}</p>
          )}
          {info && (
            <p className="text-sm text-[var(--status-free)] text-center">{info}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="nm-glow w-full rounded-xl py-3 font-semibold mt-2"
          >
            {loading ? '...' : isRegister ? 'რეგისტრაცია' : 'შესვლა'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
          {isRegister ? (
            <>
              უკვე გაქვს ანგარიში?{' '}
              <Link href="/auth/login" className="text-[var(--primary)]">
                შესვლა
              </Link>
            </>
          ) : (
            <>
              არ გაქვს ანგარიში?{' '}
              <Link href="/auth/register" className="text-[var(--primary)]">
                დარეგისტრირდი
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="nm-inset mt-1 w-full rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[var(--ring)]/40"
      />
    </label>
  )
}
