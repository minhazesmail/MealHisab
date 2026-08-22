'use client'

import type { ReactNode } from 'react'
import { useI18n } from '@/components/language-provider'
import { InviteSharePanel } from '@/components/invite-share'

export function SettingsClient({ flat, cycle, members, closedDays, canManage, leaveButton, closeButton, messClosedForm, removeButtons, vacationForm, vacationList, managerVacationForm }: any) {
  const { t } = useI18n()
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">{t('settings.title')}</h1><p className="text-sm text-muted">{t('settings.subtitle')}</p></div>
    <section className="card grid gap-4 sm:grid-cols-2"><div><div className="text-sm text-muted">{t('settings.flat')}</div><div className="mt-1 font-semibold">{flat.name}</div></div><div><div className="text-sm text-muted">{t('settings.mealPolicy')}</div><div className="mt-1 font-semibold">{flat.mealPolicy==='opt_out'?t('onboarding.optOut'):t('onboarding.optIn')}</div></div><div><div className="text-sm text-muted">{t('settings.cycle')}</div><div className="mt-1 font-semibold">{cycle?`${cycle.startDate} → ${cycle.endDate}`:'—'}</div></div></section>
    <InviteSharePanel inviteCode={flat.inviteCode} flatName={flat.name}/>
    {cycle && <><div className="grid gap-4 lg:grid-cols-2">{vacationForm}{managerVacationForm}</div>{vacationList}</>}
    {canManage&&cycle&&<section className="card space-y-4"><div><h2 className="font-semibold">{t('settings.holidays')}</h2><p className="text-sm text-muted">{t('settings.holidaysHelp')}</p></div>{messClosedForm}<div className="divide-y rounded-2xl border border-line">{closedDays.map((day:any,i:number)=><div key={day.date} className="flex items-center justify-between gap-4 px-4 py-3 text-sm"><div><span className="font-medium">{day.date}</span><span className="ml-3 text-muted">{day.reason}</span></div>{removeButtons[i]}</div>)}{closedDays.length===0&&<div className="px-4 py-4 text-sm text-muted">{t('settings.noClosedDays')}</div>}</div></section>}
    <section className="card"><h2 className="mb-4 font-semibold">{t('settings.members')}</h2><div className="space-y-3">{members.map((x:any)=><div key={x.userId} className="flex items-center justify-between border-b border-line pb-3 text-sm last:border-0"><div><div className="font-medium">{x.name}</div><div className="text-muted">{x.status} · {x.role}</div></div><div className="text-right text-muted">{t('settings.joined')} {x.joinedAt.slice(0,10)}</div></div>)}</div></section>
    <section className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{t('settings.leave')}</h2><p className="text-sm text-muted">{t('settings.leaveHelp')}</p></div>{leaveButton}</section>
    {canManage&&cycle&&<section className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{t('settings.closeCycle')}</h2><p className="text-sm text-muted">{t('settings.closeHelp')}</p></div>{closeButton}</section>}
  </div>
}
