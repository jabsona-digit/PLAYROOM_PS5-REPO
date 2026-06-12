'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function BookingReview({
  bookingId,
  initialRating,
  initialComment,
  reviewed,
}: {
  bookingId: string
  initialRating?: number
  initialComment?: string
  reviewed?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(initialRating ?? 0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState(initialComment ?? '')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(reviewed ?? false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (rating < 1) {
      setError('აირჩიე შეფასება (1-5 ვარსკვლავი)')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.rpc('submit_review', {
      p_booking_id: bookingId,
      p_rating: rating,
      p_comment: comment.trim() || undefined,
    })
    setSaving(false)
    if (error) {
      setError('ვერ შეინახა, სცადე თავიდან')
      return
    }
    setDone(true)
    setOpen(false)
  }

  // Already reviewed → show the stars read-only with an edit affordance
  if (done && !open) {
    return (
      <div className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3 text-sm">
        <span className="text-[var(--muted-foreground)]">შენი შეფასება:</span>
        <span className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`size-4 ${i < rating ? 'fill-[var(--primary)] text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}
            />
          ))}
        </span>
        <button onClick={() => setOpen(true)} className="text-xs text-[var(--primary)]">
          რედაქტირება
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <button
          onClick={() => setOpen(true)}
          className="nm-btn rounded-xl px-4 py-2 text-sm font-medium text-[var(--primary)]"
        >
          ⭐ შეაფასე
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 border-t border-[var(--border)] pt-3 space-y-3">
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const v = i + 1
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover(v)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(v)}
              aria-label={`${v} ვარსკვლავი`}
            >
              <Star
                className={`size-7 transition ${
                  v <= (hover || rating)
                    ? 'fill-[var(--primary)] text-[var(--primary)]'
                    : 'text-[var(--muted-foreground)]'
                }`}
              />
            </button>
          )
        })}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="დაწერე შენი შთაბეჭდილება (არასავალდებულო)"
        rows={2}
        className="nm-inset w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
      />
      {error && <p className="text-sm text-[var(--status-busy)]">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="nm-glow rounded-xl px-5 py-2 text-sm font-semibold"
        >
          {saving ? '...' : 'გაგზავნა'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="nm-btn rounded-xl px-4 py-2 text-sm text-[var(--muted-foreground)]"
        >
          გაუქმება
        </button>
      </div>
    </div>
  )
}
