"use client"

import { useState, useRef, useEffect } from 'react'

export function ChatConcierge() {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'გამარჯობა! მე მარტეს AI კონსიერჟი ვარ. რა გეგმები გვაქვს დღეს, ბილიარდი, VIP ოთახი თუ უბრალოდ ლაუნჯი და კოქტეილები?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, open])

  const send = async () => {
    if (!input.trim() || loading) return
    const newMsg = { role: 'user' as const, text: input }
    setHistory((prev) => [...prev, newMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'guest_concierge',
          messages: [...history, newMsg]
        })
      })

      const data = await res.json()
      if (data.text) {
        setHistory((prev) => [...prev, { role: 'model', text: data.text }])
      }
    } catch (err) {
      setHistory((prev) => [...prev, { role: 'model', text: 'სისტემური შეცდომა. სცადეთ მოგვიანებით.' }])
    }
    setLoading(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="h-14 w-14 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:scale-105 transition-transform"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor" />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="w-[350px] h-[500px] max-h-[80vh] max-w-[calc(100vw-32px)] bg-[#161618] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">

          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-white/5 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">🤖</div>
              <div>
                <h3 className="text-white font-medium text-sm leading-tight">M. Premium Concierge</h3>
                <span className="text-xs text-indigo-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                  Online
                </span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {history.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3.5 rounded-2xl max-w-[85%] text-[15px] leading-relaxed shadow-sm
                     ${m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-[4px]'
                    : 'bg-[#222225] border border-white/5 text-white/90 rounded-bl-[4px]'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="p-4 rounded-2xl bg-[#222225] border border-white/5 text-white/90 rounded-bl-[4px] flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/5 bg-[#121213] relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="მოიძიეთ ლაუნჯი..."
              className="w-full bg-[#222225] border border-white/10 rounded-full pl-5 pr-12 py-3.5 text-[15px] text-white focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:bg-white/10 focus:outline-none hover:bg-indigo-500 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="translate-x-[1px]"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
