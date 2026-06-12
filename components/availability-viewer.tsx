'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Busy = { start: string; end: string }
type Row = {
  console_id: number
  console_name: string
  slot_number: number
  busy: Busy[]
}

// Operating window shown on the timeline (local hours).
const START_HOUR = 10
const END_HOUR = 24
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

function dayLabel(d: Date) {
  const days = ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ']
  return { dow: days[d.getDay()], day: d.getDate() }
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function AvailabilityViewer({ slug }: { slug: string }) {
  const dates = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      return d
    })
  }, [])

  const [selected, setSelected] = useState(0)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const supabase = createClient()
    supabase
      .rpc('get_venue_availability', {
        p_slug: slug,
        p_date: toISODate(dates[selected]),
      })
      .then(({ data }) => {
        if (!active) return
        setRows(((data ?? []) as Row[]).sort((a, b) => a.slot_number - b.slot_number))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [slug, selected, dates])

  // Is hour h busy for a given row?
  function isBusy(busy: Busy[], h: number) {
    return busy.some((b) => {
      const s = new Date(b.start)
      const e = new Date(b.end)
      const cellStart = new Date(dates[selected])
      cellStart.setHours(h, 0, 0, 0)
      const cellEnd = new Date(cellStart)
      cellEnd.setHours(h + 1)
      return s < cellEnd && e > cellStart
    })
  }

  return (
    <div className="nm-raised rounded-2xl p-4 sm:p-5">
      {/* Date selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dates.map((d, i) => {
          const { dow, day } = dayLabel(d)
          const active = i === selected
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-center transition ${
                active ? 'nm-glow' : 'nm-btn'
              }`}
            >
              <div className="text-xs text-[var(--muted-foreground)]">{dow}</div>
              <div className="font-semibold">{day}</div>
            </button>
          )
        })}
      </div>

      {/* Hour scale */}
      <div className="mt-4 flex items-center gap-1 pl-[88px] text-[10px] text-[var(--muted-foreground)]">
        {HOURS.filter((h) => h % 2 === 0).map((h) => (
          <div key={h} className="flex-1 text-left">
            {h}:00
          </div>
        ))}
      </div>

      {/* Console rows */}
      {loading ? (
        <div className="py-10 text-center text-[var(--muted-foreground)] text-sm">
          იტვირთება…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-[var(--muted-foreground)] text-sm">
          კონსოლები არ მოიძებნა.
        </div>
      ) : (
        <div className="mt-1 space-y-1.5">
          {rows.map((r) => (
            <div key={r.console_id} className="flex items-center gap-2">
              <div className="w-20 shrink-0 text-sm font-medium truncate">
                {r.console_name}
              </div>
              <div className="flex flex-1 gap-0.5">
                {HOURS.map((h) => {
                  const busy = isBusy(r.busy, h)
                  return (
                    <div
                      key={h}
                      title={`${h}:00${busy ? ' — დაკავებული' : ' — თავისუფალი'}`}
                      className={`h-7 flex-1 rounded-[5px] ${
                        busy
                          ? 'bg-[var(--status-busy)]/70'
                          : 'bg-[var(--status-free)]/25 hover:bg-[var(--status-free)]/45'
                      } transition-colors`}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-[var(--status-free)]/40" /> თავისუფალი
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-[var(--status-busy)]/70" /> დაკავებული
        </span>
      </div>
    </div>
  )
}
