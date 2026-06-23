'use client'

// Captures a referral code from the share link (play.martelounge.ge/?ref=CODE) into
// localStorage on landing — consumed at register/login (auth-form -> claim_referral).
// Client-side only, so it never breaks the ISR-cached/cookie-less public pages.
import { useEffect } from 'react'

export function ReferralCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref')
      if (ref && ref.trim()) localStorage.setItem('mtl_ref', ref.trim().toUpperCase())
    } catch { /* ignore */ }
  }, [])
  return null
}
