'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { generateInviteCode, revokeInviteCode } from '@/app/invite-actions'

export function InviteCodeManager({ flatId, rows }: { flatId: string; rows: Array<{ id: string; code: string; createdAt: string; revokedAt: string | null }> }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [latest, setLatest] = useState<string | null>(null)
  const activeCount = rows.filter((row) => !row.revokedAt).length

  return <section className="card space-y-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-semibold">Invite codes</h2>
        <p className="mt-1 text-sm text-muted">Maximum 10 codes per calendar month. Revoke any code you no longer trust.</p>
      </div>
      <button type="button" className="btn-primary" disabled={pending} onClick={() => start(async () => {
        try { setError(''); const code = await generateInviteCode(flatId); setLatest(code); toast.success(`Invite code ${code} created`) }
        catch (err) { const message = err instanceof Error ? err.message : 'Could not create invite code'; setError(message); toast.error(message) }
      })}>{pending ? 'Working…' : 'Generate code'}</button>
    </div>
    {latest && <div className="rounded-2xl border border-brand-green/30 bg-brand-green/5 p-4"><div className="text-xs text-muted">New code</div><div className="mt-1 font-mono text-2xl font-bold tracking-[0.25em] text-brand-green">{latest}</div></div>}
    {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    <div className="space-y-2">
      {rows.slice(0, 10).map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-3 py-3"><div><div className={`font-mono font-semibold tracking-widest ${row.revokedAt ? 'text-muted line-through' : 'text-main'}`}>{row.code}</div><div className="mt-1 text-xs text-muted">Created {new Date(row.createdAt).toLocaleDateString('en-BD')}</div></div>{row.revokedAt ? <span className="text-xs text-muted">Revoked</span> : <button type="button" className="text-xs font-semibold text-danger" disabled={pending} onClick={() => start(async () => { try { setError(''); await revokeInviteCode(row.id); toast.success('Invite code revoked') } catch (err) { const message=err instanceof Error?err.message:'Could not revoke code'; setError(message); toast.error(message) } })}>Revoke</button>}</div>)}
    </div>
    <p className="text-xs text-muted">{activeCount} active code{activeCount === 1 ? '' : 's'} shown. Members never pay to join with a valid code.</p>
  </section>
}
