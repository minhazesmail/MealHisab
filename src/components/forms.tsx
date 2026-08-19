'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  saveExpense,
  saveContribution,
  closeCycle,
  leaveFlat,
  setCycleClosedDay,
  removeCycleClosedDay,
  recordSettlementPayment,
} from '@/app/actions'
import { useI18n } from '@/components/language-provider'

function ActionError({ message }: { message: string }) {
  return message ? (
    <p className="text-sm text-red-600" role="alert">
      {message}
    </p>
  ) : null
}

export function ExpenseForm({ flatId, cycleId }: { flatId: string; cycleId: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  return (
    <form
      className="card space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        setError('')
        const formElement = event.currentTarget
        const form = new FormData(formElement)
        const data = {
          flatId,
          cycleId,
          amount: Number(form.get('amount')),
          category: String(form.get('category')),
          note: String(form.get('note') || ''),
        }
        start(async () => {
          try {
            await saveExpense(data)
            formElement.reset()
            router.refresh()
          } catch (err) {
            setError(err instanceof Error ? err.message : t('common.error'))
          }
        })
      }}
    >
      <h2 className="font-semibold">{t('expenses.add')}</h2>
      <input name="amount" type="number" min="0.01" step="0.01" className="input" placeholder={t('common.amount')} required />
      <select name="category" className="input" defaultValue="grocery">
        <option value="grocery">{t('expenses.grocery')}</option>
        <option value="cook_salary">{t('expenses.cook')}</option>
        <option value="gas">{t('expenses.gas')}</option>
        <option value="other">{t('expenses.other')}</option>
      </select>
      <input name="note" className="input" placeholder={t('common.note')} maxLength={500} />
      <ActionError message={error} />
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t('common.saving') : t('common.save')}
      </button>
    </form>
  )
}

type ContributionMember = { userId: string; name: string }

export function ContributionForm({
  flatId,
  cycleId,
  userId,
  members = [],
}: {
  flatId: string
  cycleId: string
  userId: string
  members?: ContributionMember[]
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const canChooseMember = members.length > 0
  return (
    <form
      className="card space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        setError('')
        const formElement = event.currentTarget
        const form = new FormData(formElement)
        const targetUserId = String(form.get('userId') || userId)
        const data = {
          flatId,
          cycleId,
          userId: targetUserId,
          amount: Number(form.get('amount')),
          note: String(form.get('note') || ''),
        }
        start(async () => {
          try {
            await saveContribution(data)
            formElement.reset()
            const el = formElement.elements.namedItem('userId') as HTMLSelectElement | null
            if (canChooseMember && el) el.value = userId
            router.refresh()
          } catch (err) {
            setError(err instanceof Error ? err.message : t('common.error'))
          }
        })
      }}
    >
      <div>
        <h2 className="font-semibold">{t('contrib.add')}</h2>
        <p className="mt-1 text-xs text-slate-500">{t('contrib.help')}</p>
      </div>
      {canChooseMember && (
        <label className="block text-sm font-medium text-slate-700">
          {t('contrib.member')}
          <select name="userId" className="input mt-1.5" defaultValue={userId}>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
                {member.userId === userId ? ` (${t('common.you')})` : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      <input name="amount" type="number" min="0.01" step="0.01" className="input" placeholder={t('common.amount')} required />
      <input name="note" className="input" placeholder={t('common.note')} maxLength={500} />
      <ActionError message={error} />
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t('common.saving') : t('contrib.add')}
      </button>
    </form>
  )
}

export function CloseCycleButton({ cycleId }: { cycleId: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t('settings.closeHelp'))) return
          setError('')
          start(async () => {
            try {
              await closeCycle(cycleId)
              router.refresh()
            } catch (err) {
              setError(err instanceof Error ? err.message : t('common.error'))
            }
          })
        }}
      >
        {pending ? t('common.saving') : t('settings.closeCycle')}
      </button>
      <ActionError message={error} />
    </div>
  )
}

export function LeaveFlatButton({ flatId }: { flatId: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-secondary"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t('settings.leaveHelp'))) return
          setError('')
          start(async () => {
            try {
              await leaveFlat(flatId)
              router.push('/onboarding')
              router.refresh()
            } catch (err) {
              setError(err instanceof Error ? err.message : t('common.error'))
            }
          })
        }}
      >
        {pending ? t('common.saving') : t('settings.leave')}
      </button>
      <ActionError message={error} />
    </div>
  )
}

export function MessClosedForm({ cycleId }: { cycleId: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        setError('')
        const formElement = event.currentTarget
        const form = new FormData(formElement)
        start(async () => {
          try {
            await setCycleClosedDay({
              cycleId,
              date: String(form.get('date')),
              reason: String(form.get('reason') || t('calendar.defaultReason')),
            })
            formElement.reset()
            router.refresh()
          } catch (err) {
            setError(err instanceof Error ? err.message : t('common.error'))
          }
        })
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input name="date" type="date" className="input" required />
        <input name="reason" className="input" maxLength={200} placeholder={t('calendar.reasonPlaceholder')} />
        <button className="btn-primary" disabled={pending}>
          {pending ? t('common.saving') : t('calendar.markClosed')}
        </button>
      </div>
      <ActionError message={error} />
    </form>
  )
}

export function RemoveClosedDayButton({ cycleId, date }: { cycleId: string; date: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  return (
    <div className="space-y-1 text-right">
      <button
        type="button"
        className="text-xs font-semibold text-slate-500 hover:text-slate-950"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              await removeCycleClosedDay({ cycleId, date })
              router.refresh()
            } catch (err) {
              setError(err instanceof Error ? err.message : t('common.error'))
            }
          })
        }
      >
        {pending ? t('common.saving') : t('calendar.reopen')}
      </button>
      <ActionError message={error} />
    </div>
  )
}

export function SettlementPaymentForm({
  settlementId,
  maxAmount,
  direction,
}: {
  settlementId: string
  maxAmount: number
  direction: 'payout' | 'collection'
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        setError('')
        const formElement = event.currentTarget
        const form = new FormData(formElement)
        const amount = Number(form.get('amount'))
        const note = String(form.get('note') || '')
        start(async () => {
          try {
            await recordSettlementPayment({ settlementId, amount, note })
            formElement.reset()
            router.refresh()
          } catch (err) {
            setError(err instanceof Error ? err.message : t('common.error'))
          }
        })
      }}
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input name="amount" type="number" min="0.01" max={maxAmount.toFixed(2)} step="0.01" className="input" placeholder={t('common.amount')} required />
        <input name="note" className="input" maxLength={500} placeholder={t('common.note')} />
        <button className="btn-primary" disabled={pending}>
          {pending ? t('common.saving') : t('common.save')}
        </button>
      </div>
      <ActionError message={error} />
    </form>
  )
}
