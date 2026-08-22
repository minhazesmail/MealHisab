'use client'

import { useEffect, useState } from 'react'
import { Bell, Moon } from 'lucide-react'
import { toast } from 'sonner'

type Prefs = {
  meal_reminders_enabled: boolean
  reminder_mode: 'daily' | 'when_not_logged'
  reminder_time: string
  quiet_hours_enabled: boolean
  quiet_start: string
  quiet_end: string
  language: 'en' | 'bn'
}

const FALLBACK: Prefs = {
  meal_reminders_enabled: true,
  reminder_mode: 'when_not_logged',
  reminder_time: '11:00',
  quiet_hours_enabled: false,
  quiet_start: '22:00',
  quiet_end: '07:00',
  language: 'en',
}

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<Prefs>(FALLBACK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setPrefs(data))
      .catch(() => toast.error('Could not load reminder preferences.'))
      .finally(() => setLoading(false))
  }, [])

  async function save(next: Prefs) {
    setPrefs(next)
    setSaving(true)
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error()
      toast.success('Reminder preferences saved')
    } catch {
      toast.error('Could not save reminder preferences.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <section className="card h-44 animate-pulse" aria-label="Loading reminder settings" />

  return (
    <section className="card space-y-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-surface-3 p-2 text-brand-green"><Bell size={18} /></span>
        <div>
          <h2 className="font-semibold">Meal reminders</h2>
          <p className="text-sm text-muted">Get a nudge before forgotten meals turn into surprise charges.</p>
        </div>
      </div>

      <label className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface-2 p-3">
        <span className="text-sm font-medium">Daily meal reminders</span>
        <input
          type="checkbox"
          checked={prefs.meal_reminders_enabled}
          disabled={saving}
          onChange={(e) => save({ ...prefs, meal_reminders_enabled: e.target.checked })}
          className="h-5 w-5 accent-emerald-500"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Reminder mode</span>
          <select className="input" value={prefs.reminder_mode} disabled={saving} onChange={(e) => save({ ...prefs, reminder_mode: e.target.value as Prefs['reminder_mode'] })}>
            <option value="when_not_logged">Only when meal is not logged</option>
            <option value="daily">Every day</option>
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Daily reminder time</span>
          <select className="input" value={prefs.reminder_time} disabled={saving} onChange={(e) => save({ ...prefs, reminder_time: e.target.value })}>
            <option value="09:00">9:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="18:00">6:00 PM</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Language</span>
          <select className="input" value={prefs.language} disabled={saving} onChange={(e) => save({ ...prefs, language: e.target.value as Prefs['language'] })}>
            <option value="en">English</option>
            <option value="bn">বাংলা</option>
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={prefs.quiet_hours_enabled} disabled={saving} onChange={(e) => save({ ...prefs, quiet_hours_enabled: e.target.checked })} className="mb-0.5 h-5 w-5 accent-emerald-500" />
          <span className="font-medium"><Moon size={14} className="mr-1 inline" />Quiet hours</span>
        </label>
      </div>

      {prefs.quiet_hours_enabled && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Quiet start</span>
            <input type="time" className="input" value={prefs.quiet_start} disabled={saving} onChange={(e) => save({ ...prefs, quiet_start: e.target.value })} />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Quiet end</span>
            <input type="time" className="input" value={prefs.quiet_end} disabled={saving} onChange={(e) => save({ ...prefs, quiet_end: e.target.value })} />
          </label>
        </div>
      )}
    </section>
  )
}
