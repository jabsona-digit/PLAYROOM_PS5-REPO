import type { Metadata } from 'next'
import { Noto_Sans_Georgian } from 'next/font/google'
import Link from 'next/link'
import { HeaderAuth } from '@/components/header-auth'
import { ChatConcierge } from '@/components/ChatConcierge'
import { SentryInit } from '@/components/sentry-init'
import './globals.css'

const notoGeorgian = Noto_Sans_Georgian({
  variable: '--font-noto-georgian',
  subsets: ['georgian', 'latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Martelounge — PlayStation კლუბები საქართველოში',
    template: '%s · Martelounge',
  },
  description:
    'იპოვე და დაჯავშნე PlayStation 5 კონსოლი შენს ქალაქში — ცოცხალი ხელმისაწვდომობა, მარტივი ჯავშანი Martelounge-ზე.',
  metadataBase: new URL('https://play.martelounge.ge'),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Martelounge',
    locale: 'ka_GE',
    url: 'https://play.martelounge.ge',
    title: 'Martelounge — PlayStation კლუბები საქართველოში',
    description:
      'იპოვე და დაჯავშნე PlayStation 5 კონსოლი შენს ქალაქში — ცოცხალი ხელმისაწვდომობა, მარტივი ჯავშანი.',
  },
  twitter: { card: 'summary_large_image' },
  verification: { google: 'Z7s8o7LVOARJUvdVEK4dvDKQKoeIovggssg17u_GbMo' },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ka" className={`${notoGeorgian.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SentryInit />
        <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--background)]/80 border-b border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight text-glow">
              MARTE<span className="text-[var(--primary)]">LOUNGE</span>
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              <Link
                href="/live"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:text-[var(--primary)] transition-colors"
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--primary)] opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-[var(--primary)]" />
                </span>
                Pulse
              </Link>
              <Link
                href="/venues"
                className="px-3 py-2 rounded-lg hover:text-[var(--primary)] transition-colors"
              >
                კლუბები
              </Link>
              <Link
                href="/tournaments"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:text-[var(--primary)] transition-colors"
              >
                🏆 <span className="hidden sm:inline">ტურნირები</span>
              </Link>
              <HeaderAuth />
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-[var(--border)] mt-16">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-[var(--muted-foreground)] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>© {new Date().getFullYear()} Martelounge</span>
            <span className="text-xs">PlayStation კლუბების პლატფორმა საქართველოში</span>
          </div>
        </footer>
        <ChatConcierge />
      </body>
    </html>
  )
}
