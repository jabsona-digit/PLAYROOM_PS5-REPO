import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/auth-form'

export const metadata = { title: 'რეგისტრაცია' }

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  )
}
