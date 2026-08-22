'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { generateInviteCode, revokeInviteCode } from '@/app/invite-actions'

type InviteRow = { id: string; code: string; status: 'active'|'used'|'revoked'|'expired'; maxUses: number; usedCount: number; createdMonth: string; createdAt: string; revokedAt: string | null; expiresAt: string | null; usedAt: string | null }

function dhakaMonthKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit' }).format(date)
}

export function InviteCodeManager({ flatId, rows }: { flatId: string; rows: InviteRow[] }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [latest, setLatest] = useState<string | null>(null)
  const now = Date.now()
  const currentMonth = useMemo(() => dhakaMonthKey(), [])
  const generatedThisMonth = rows.filter((row) => row.createdMonth?.slice(0, 7) === currentMonth).length
  const remaining = Math.max(0, 10 - generatedThisMonth)

  function label(state: InviteRow['status']) { return state.charAt(0).toUpperCase() + state.slice(1) }

  return <section className="card space-y-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-semibold">Invite codes</h2>
        <p className="mt-1 text-sm text-muted">Single-use codes expire after 7 days. Every generated code counts toward the monthly quota, including used, expired, and revoked codes.</p>
      </div>
      <button type="button" className="btn-primary" disabled={pending || remaining === 0} onClick={() => start(async () => {
        try { setError(''); const code = await generateInviteCode(flatId); setLatest(code); toast.success(`Invite code ${code} created`) }
        catch (err) { const message = err instanceof Error ? err.message : 'Could not create invite code'; setError(message); toast.error(message) }
      })}>{pending ? 'Working…' : remaining === 0 ? 'Monthly limit reached' : 'Generate code'}</button>
    </div>

    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-line bg-surface-2 p-3"><div className="text-xs text-muted">Generated this month</div><div className="mt-1 text-2xl font-bold text-main">{generatedThisMonth} / 10</div></div>
      <div className="rounded-xl border border-line bg-surface-2 p-3"><div className="text-xs text-muted">Remaining</div><div className="mt-1 text-2xl font-bold text-brand-green">{remaining}</div></div>
      <div className="rounded-xl border border-line bg-surface-2 p-3"><div className="text-xs text-muted">Active now</div><div className="mt-1 text-2xl font-bold text-main">{rows.filter((row) => row.status === 'active' && row.usedCount < row.maxUses && (!row.expiresAt || new Date(row.expiresAt).getTime() > now)).length}</div></div>
    </div>

    {latest && <div className="rounded-2xl border border-brand-green/30 bg-brand-green/5 p-4"><div className="text-xs text-muted">New code</div><div className="mt-1 font-mono text-2xl font-bold tracking-[0.25em] text-brand-green">{latest}</div><div className="mt-2 text-xs text-muted">Single-use • expires in 7 days</div></div>}
    {error && <p className="text-sm text-danger" role="alert">{error}</p>}

    <div className="space-y-2">
      {rows.slice(0, 10).map((row) => {
        const canRevoke = row.status === 'active' && row.usedCount < row.maxUses
        return <div key={row.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className={`font-mono font-semibold tracking-widest ${row.status === 'active' ? 'text-main' : 'text-muted'}`}>{row.code}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              <span>Created {new Date(row.createdAt).toLocaleDateString('en-BD')}</span>
              {row.expiresAt && <span>Expires {new Date(row.expiresAt).toLocaleDateString('en-BD')}</span>}
              {row.usedAt && <span>Used {new Date(row.usedAt).toLocaleDateString('en-BD')}</span>}
              <span>Uses {row.usedCount}/{row.maxUses}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold ${row.status === 'active' ? 'text-brand-green' : row.status === 'revoked' ? 'text-danger' : 'text-muted'}`}>{label(row.status)}</span>
            {canRevoke && <button type="button" className="text-xs font-semibold text-danger" disabled={pending} onClick={() => start(async () => { try { setError(''); await revokeInviteCode(row.id); toast.success('Invite code revoked') } catch (err) { const message=err instanceof Error?err.message:'Could not revoke code'; setError(message); toast.error(message) } })}>Revoke</button>}
          </div>
        </div>
      })}
    </div>
    <p className="text-xs text-muted">Calendar-month quota resets at 12:00 AM Asia/Dhaka on the 1st of each month. Members never pay to join with a valid active code.</p>
  </section>
}
