'use client'

import { useTransition } from 'react'
import { requestFlatRecovery } from '@/app/recovery-actions'

export function FlatRecoveryBanner({ flatId, state }: { flatId: string; state: 'read_only_recovery' | 'support_takeover_eligible' }) {
  const [pending, startTransition] = useTransition()
  const recovery = state === 'support_takeover_eligible'

  return (
    <section className="border-b border-amber-400/30 bg-amber-400/10 px-4 py-3 text-amber-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            {recovery
              ? 'This flat is in recovery mode. Members can still view their history and request support takeover.'
              : 'This flat is read-only because the manager subscription has expired. Your data is preserved.'}
          </p>
          <p className="mt-1 text-xs text-amber-100/75">
            {recovery ? 'You may request an export or ask MealHisab Support to help recover the flat.' : 'Members are not being penalized for the manager’s billing lapse. Renewal restores normal operation.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(state === 'read_only_recovery' || recovery) && (
            <form action={requestFlatRecovery}>
              <input type="hidden" name="flat_id" value={flatId} />
              <input type="hidden" name="type" value="export" />
              <button className="btn-secondary whitespace-nowrap" disabled={pending}>{pending ? 'Requesting…' : 'Request export'}</button>
            </form>
          )}
          {recovery && (
            <form action={requestFlatRecovery}>
              <input type="hidden" name="flat_id" value={flatId} />
              <input type="hidden" name="type" value="support_takeover" />
              <button className="btn-primary whitespace-nowrap" disabled={pending}>{pending ? 'Requesting…' : 'Request support takeover'}</button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
