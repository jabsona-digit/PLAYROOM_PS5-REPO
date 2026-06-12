import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/auth-form'

export const metadata = { title: 'შესვლა' }

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  )
}
