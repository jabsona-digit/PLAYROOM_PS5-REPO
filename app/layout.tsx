import type { Metadata } from 'next'
import { Noto_Sans_Georgian } from 'next/font/google'
import Link from 'next/link'
import { getUser } from '@/lib/auth'
import { SignOutButton } from '@/components/sign-out-button'
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
  metadataBase: new URL('https://martelounge.ge'),
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser()

  return (
    <html lang="ka" className={`${notoGeorgian.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--background)]/80 border-b border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight text-glow">
              MARTE<span className="text-[var(--primary)]">LOUNGE</span>
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              <Link
                href="/venues"
                className="px-3 py-2 rounded-lg hover:text-[var(--primary)] transition-colors"
              >
                კლუბები
              </Link>
              {user ? (
                <>
                  <Link
                    href="/account"
                    className="nm-btn px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    ჩემი ჯავშნები
                  </Link>
                  <SignOutButton />
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="nm-btn px-4 py-2 rounded-xl text-sm font-medium"
                >
                  შესვლა
                </Link>
              )}
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
      </body>
    </html>
  )
}
