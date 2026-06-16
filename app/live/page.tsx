import { createPublicClient } from '@/lib/supabase/public'
import { PulseLive, type PulseStats } from '@/components/pulse-live'

// ISR for SEO/first paint; the client component then polls every 15s for "live".
export const revalidate = 15

export const metadata = {
  title: 'Martelounge Pulse — ცოცხალი გეიმინგ ქსელი',
  description:
    'რამდენი ადამიანი თამაშობს ახლა საქართველოს PlayStation ლაუნჯებში — ცოცხალი, real-time სტატისტიკა ქალაქებისა და ლაუნჯების მიხედვით.',
}

export default async function LivePage() {
  const supabase = createPublicClient()
  const { data } = await (supabase.rpc as unknown as (f: string) => Promise<{ data: PulseStats | null }>)('get_pulse_stats')

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PulseLive initial={(data as PulseStats) ?? null} />
    </div>
  )
}
