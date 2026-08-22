'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { configureCycleMode } from '@/app/festival-actions'

type CycleType = 'regular' | 'short' | 'eid' | 'festival'

export function FestivalModeSettings({
  cycle,
}: {
  cycle: {
    id: string
    cycleType: CycleType
    festivalName: string | null
    festivalStartDate: string | null
    festivalEndDate: string | null
    mealsPaused: boolean
  }
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [type, setType] = useState<CycleType>(cycle.cycleType)
  const [name, setName] = useState(cycle.festivalName ?? '')
  const [startDate, setStartDate] = useState(cycle.festivalStartDate ?? '')
  const [endDate, setEndDate] = useState(cycle.festivalEndDate ?? '')
  const [paused, setPaused] = useState(cycle.mealsPaused)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    start(async () => {
      try {
        await configureCycleMode({ cycleId: cycle.id, cycleType: type, festivalName: name, festivalStartDate: startDate || undefined, festivalEndDate: endDate || undefined, mealsPaused: paused })
        toast.success(type === 'eid' ? 'Eid mode saved' : type === 'festival' ? 'Festival mode saved' : 'Cycle mode saved')
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not save cycle mode'
        setError(message); toast.error(message)
      }
    })
  }

  return <form className="card space-y-4" onSubmit={submit}>
    <div>
      <h2 className="font-semibold">Eid / Festival mode</h2>
      <p className="mt-1 text-sm text-muted">Pause normal meal accounting for a festival break while keeping the cycle and expenses transparent.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Cycle mode<select className="input mt-1" value={type} onChange={(e) => setType(e.target.value as CycleType)}><option value="regular">Regular cycle</option><option value="short">Short cycle</option><option value="eid">Eid cycle</option><option value="festival">Festival cycle</option></select></label>
      <label className="text-sm">Festival name<input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Eid break" maxLength={120}/></label>
      <label className="text-sm">Break starts<input type="date" className="input mt-1" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
      <label className="text-sm">Break ends<input type="date" className="input mt-1" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
    </div>
    <label className="flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-3 text-sm"><input type="checkbox" className="mt-1" checked={paused} onChange={(e) => setPaused(e.target.checked)} /><span><span className="font-semibold">Auto-pause meals during the break</span><span className="mt-1 block text-muted">The selected festival dates are marked as Mess Closed, so Opt-Out members are not charged. Members can still record explicit meals outside the paused dates.</span></span></label>
    {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    <button className="btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save festival mode'}</button>
  </form>
}
