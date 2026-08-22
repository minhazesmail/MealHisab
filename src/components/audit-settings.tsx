'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateAuditVisibility } from '@/app/audit-actions'

export function AuditSettings({ flatId, visibility }: { flatId: string; visibility: 'members' | 'managers' }) {
  const router = useRouter()
  const [value, setValue] = useState(visibility)
  const [pending, start] = useTransition()
  const [error, setError] = useState('')

  function save(next: 'members' | 'managers') {
    setValue(next); setError('')
    start(async () => {
      try { await updateAuditVisibility({ flatId, visibility: next }); toast.success('Activity visibility updated'); router.refresh() }
      catch (err) { const message = err instanceof Error ? err.message : 'Could not update activity visibility'; setError(message); toast.error(message); setValue(visibility) }
    })
  }

  return <section className="card space-y-3">
    <div><h2 className="font-semibold">Activity log visibility</h2><p className="mt-1 text-sm text-muted">Choose whether everyone in the mess can see the audit trail or only managers.</p></div>
    <div className="grid gap-2 sm:grid-cols-2">
      <button type="button" disabled={pending} onClick={() => save('members')} className={`rounded-2xl border p-4 text-left ${value === 'members' ? 'border-line-strong bg-surface-3 text-brand-green' : 'border-line bg-surface-2 text-main'}`}><div className="font-semibold">All members</div><div className="mt-1 text-xs text-muted">Everyone can see who changed meals, expenses and payments.</div></button>
      <button type="button" disabled={pending} onClick={() => save('managers')} className={`rounded-2xl border p-4 text-left ${value === 'managers' ? 'border-line-strong bg-surface-3 text-brand-green' : 'border-line bg-surface-2 text-main'}`}><div className="font-semibold">Managers only</div><div className="mt-1 text-xs text-muted">Only admins and managers can view the activity history.</div></button>
    </div>
    {error && <p className="text-sm text-danger" role="alert">{error}</p>}
  </section>
}
