'use client'

import type { ReactNode } from 'react'
import { useI18n } from '@/components/language-provider'
import { InviteSharePanel } from '@/components/invite-share'

type Member = {
  userId: string
  name: string
  role: string
  status: string
  joinedAt: string
}

type ClosedDay = { date: string; reason: string }

export function SettingsClient({
  flat,
  cycle,
  members,
  closedDays,
  canManage,
  leaveButton,
  closeButton,
  messClosedForm,
  removeButtons,
}: {
  flat: { name: string; inviteCode: string; mealPolicy: 'opt_out' | 'opt_in' }
  cycle: { id: string; startDate: string; endDate: string } | null
  members: Member[]
  closedDays: ClosedDay[]
  canManage: boolean
  flatId: string
  leaveButton: ReactNode
  closeButton: ReactNode
  messClosedForm: ReactNode
  removeButtons: ReactNode[]
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-sm text-slate-500">{t('settings.subtitle')}</p>
      </div>

      <section className="card grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-sm text-slate-500">{t('settings.flat')}</div>
          <div className="mt-1 font-semibold">{flat.name}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">{t('settings.mealPolicy')}</div>
          <div className="mt-1 font-semibold">
            {flat.mealPolicy === 'opt_out' ? t('onboarding.optOut') : t('onboarding.optIn')}
          </div>
        </div>
        <div>
          <div className="text-sm text-slate-500">{t('settings.cycle')}</div>
          <div className="mt-1 font-semibold">
            {cycle ? `${cycle.startDate} → ${cycle.endDate}` : '—'}
          </div>
        </div>
      </section>

      <InviteSharePanel inviteCode={flat.inviteCode} flatName={flat.name} />

      {canManage && cycle && (
        <section className="card space-y-4">
          <div>
            <h2 className="font-semibold">{t('settings.holidays')}</h2>
            <p className="text-sm text-slate-500">{t('settings.holidaysHelp')}</p>
          </div>
          {messClosedForm}
          <div className="divide-y rounded-2xl border border-slate-200 dark:border-slate-700">
            {closedDays.map((day, i) => (
              <div key={day.date} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <span className="font-medium">{day.date}</span>
                  <span className="ml-3 text-slate-500">{day.reason}</span>
                </div>
                {removeButtons[i]}
              </div>
            ))}
            {closedDays.length === 0 && (
              <div className="px-4 py-4 text-sm text-slate-500">{t('settings.noClosedDays')}</div>
            )}
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="mb-4 font-semibold">{t('settings.members')}</h2>
        <div className="space-y-3">
          {members.map((x) => (
            <div key={x.userId} className="flex items-center justify-between border-b pb-3 text-sm last:border-0">
              <div>
                <div className="font-medium">{x.name}</div>
                <div className="text-slate-500">
                  {x.status} · {x.role}
                </div>
              </div>
              <div className="text-right text-slate-500">
                {t('settings.joined')} {x.joinedAt.slice(0, 10)}
              </div>
            </div>
          ))}
          {members.length === 0 && <p className="text-sm text-slate-500">—</p>}
        </div>
      </section>

      <section className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">{t('settings.leave')}</h2>
          <p className="text-sm text-slate-500">{t('settings.leaveHelp')}</p>
        </div>
        {leaveButton}
      </section>

      {canManage && cycle && (
        <section className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">{t('settings.closeCycle')}</h2>
            <p className="text-sm text-slate-500">{t('settings.closeHelp')}</p>
          </div>
          {closeButton}
        </section>
      )}
    </div>
  )
}
