'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'

type Notice = { id: string; title: string; body: string; read_at: string | null; created_at: string }

export function NotificationBell() {
  const [items, setItems] = useState<Notice[]>([])
  const [open, setOpen] = useState(false)

  async function load() {
    const res = await fetch('/api/notifications', { cache: 'no-store' })
    if (res.ok) setItems(await res.json())
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const unread = items.filter((x) => !x.read_at).length

  async function markRead(id: string) {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) })
    setItems((current) => current.map((x) => x.id === id ? { ...x, read_at: new Date().toISOString() } : x))
  }

  return (
    <div className="relative">
      <button type="button" className="btn-secondary relative rounded-full p-2.5" onClick={() => setOpen((v) => !v)} aria-label="Notifications" aria-expanded={open}>
        <Bell size={17} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-brand-green px-1 text-[10px] font-bold text-black">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-30 cursor-default bg-black/30" aria-label="Close notifications" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div><div className="font-semibold">Notifications</div><div className="text-xs text-muted">Meal reminders and account alerts</div></div>
              <button type="button" className="btn-secondary rounded-full p-2" onClick={() => setOpen(false)} aria-label="Close notifications"><X size={14} /></button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto">
              {items.length === 0 ? <div className="px-4 py-8 text-center text-sm text-muted">You’re all caught up.</div> : items.map((item) => (
                <button key={item.id} type="button" className={`block w-full border-b border-line px-4 py-3 text-left transition hover:bg-surface-2 ${item.read_at ? '' : 'bg-surface-2/60'}`} onClick={() => void markRead(item.id)}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read_at ? 'bg-line-strong' : 'bg-brand-green shadow-glow'}`} />
                    <div className="min-w-0"><div className="text-sm font-semibold text-main">{item.title}</div><div className="mt-1 text-sm text-muted">{item.body}</div><div className="mt-1 text-[11px] text-muted">{new Date(item.created_at).toLocaleString()}</div></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
