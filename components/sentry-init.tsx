'use client'

// Client-side Sentry error monitoring for the marketplace (P1-4).
// Browser errors only here (init runs in the browser). SSR/Worker server-side
// errors are wired separately via @sentry/cloudflare (OpenNext worker wrap).
// Errors-only (no perf tracing / replay) for free-tier quota. Public DSN.

import * as Sentry from '@sentry/react'

let started = false

function startSentry() {
  if (started || typeof window === 'undefined') return
  started = true
  Sentry.init({
    dsn: 'https://a6b39e7b88adfe6f9c96b21e37e9af7b@o4511608819875840.ingest.de.sentry.io/4511608929124432',
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  })
}

startSentry()

export function SentryInit() {
  return null
}
