// Bank checkout return page — TBC/BOG redirect the customer here after payment
// (?booking=<id>&status=success|fail). The status param is DISPLAY-ONLY: the
// authoritative paid/unpaid state is set server-side by the bank's verified
// callback into the bank-pay edge fn, so a tampered URL can't fake a payment.
export const dynamic = 'force-dynamic'

export default async function PayResultPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; status?: string }>
}) {
  const { booking, status } = await searchParams
  const ok = status === 'success'

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="nm-raised w-full rounded-2xl p-8">
        <div className="text-5xl">{ok ? '✅' : '❌'}</div>
        <h1 className="mt-4 text-xl font-extrabold">
          {ok ? 'გადახდა წარმატებულია!' : 'გადახდა ვერ შესრულდა'}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {ok
            ? 'ჯავშანი დადასტურდა — ბანკის დასტური რამდენიმე წამში აისახება შენს ჯავშნებში.'
            : 'თანხა არ ჩამოგეჭრა. შეგიძლია სცადო თავიდან, ან აირჩიო გადახდა ადგილზე — ჯავშანი შენახულია.'}
        </p>
        {booking ? (
          <p className="mt-3 font-mono text-xs text-[var(--muted-foreground)]">
            ჯავშანი: {booking.slice(0, 8)}…
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2">
          <a href="/account" className="nm-glow rounded-xl px-4 py-2.5 text-sm font-bold">
            ჩემი ჯავშნები
          </a>
          <a href="/venues" className="nm-btn rounded-xl px-4 py-2.5 text-sm">
            კლუბები
          </a>
        </div>
      </div>
    </main>
  )
}
