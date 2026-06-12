'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode } from 'lucide-react'

// A booking "pass": a QR the customer shows at the venue. Encodes MLB:<id>;
// staff scan it in the admin to verify + check the customer in.
export function BookingPass({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false)
  const code = `MLB:${bookingId}`
  const short = bookingId.slice(0, 8).toUpperCase()

  return (
    <div className="mt-3 border-t border-[var(--border)] pt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="nm-btn flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-[var(--primary)]"
        >
          <QrCode className="size-4" /> ბილეთის ჩვენება (QR)
        </button>
      ) : (
        <div className="flex flex-col items-center gap-2 animate-in-up">
          <div className="rounded-2xl bg-white p-3">
            <QRCodeSVG value={code} size={168} level="M" />
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            აჩვენე ეს QR ადმინისტრატორს კლუბში
          </p>
          <p className="font-mono text-xs text-[var(--muted-foreground)]">კოდი: {short}</p>
          <button onClick={() => setOpen(false)} className="text-xs text-[var(--primary)]">
            დახურვა
          </button>
        </div>
      )}
    </div>
  )
}
