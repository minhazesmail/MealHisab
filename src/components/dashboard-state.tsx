'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, RefreshCw, Settings, History } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/language-provider'

type DashboardStateKind = 'membership_error' | 'flat_error' | 'flat_missing' | 'cycle_error' | 'no_cycle' | 'data_error'

const copy = {
  en: {
    membership_error: ['Could not load your workspace', 'We could not verify your active flat membership. This is usually temporary.'],
    flat_error: ['Could not load your flat', 'Your membership is available, but the flat details could not be loaded.'],
    flat_missing: ['Flat record not found', 'Your account still has a membership, but the linked flat is unavailable. Try again before changing anything.'],
    cycle_error: ['Could not load the current cycle', 'Your flat is available, but this month’s accounting cycle could not be loaded.'],
    no_cycle_manager: ['No active meal cycle', 'There is no open accounting cycle right now. Review the flat settings before recording new meals or expenses.'],
    no_cycle_member: ['No active meal cycle yet', 'Your manager has not opened the next accounting cycle yet. You can still review previous reports while you wait.'],
    data_error: ['Dashboard data is incomplete', 'We could not load the complete meal, expense and contribution ledger. No changes were made.'],
    retry: 'Try again',
    settings: 'Review flat settings',
    reports: 'View previous reports',
  },
  bn: {
    membership_error: ['ওয়ার্কস্পেস লোড করা যায়নি', 'আপনার সক্রিয় ফ্ল্যাট সদস্যপদ যাচাই করা যায়নি। এটি সাধারণত সাময়িক সমস্যা।'],
    flat_error: ['ফ্ল্যাট লোড করা যায়নি', 'আপনার সদস্যপদ পাওয়া গেছে, কিন্তু ফ্ল্যাটের তথ্য লোড করা যায়নি।'],
    flat_missing: ['ফ্ল্যাটের তথ্য পাওয়া যায়নি', 'আপনার সদস্যপদ আছে, কিন্তু যুক্ত ফ্ল্যাটটি এখন পাওয়া যাচ্ছে না। কিছু পরিবর্তন করার আগে আবার চেষ্টা করুন।'],
    cycle_error: ['বর্তমান সাইকেল লোড করা যায়নি', 'ফ্ল্যাট পাওয়া গেছে, কিন্তু এই মাসের হিসাবের সাইকেল লোড করা যায়নি।'],
    no_cycle_manager: ['কোনো সক্রিয় মিল সাইকেল নেই', 'এখন কোনো খোলা হিসাবের সাইকেল নেই। নতুন মিল বা খরচ যোগ করার আগে ফ্ল্যাট সেটিংস দেখুন।'],
    no_cycle_member: ['এখনো সক্রিয় মিল সাইকেল নেই', 'ম্যানেজার এখনো পরবর্তী হিসাবের সাইকেল চালু করেননি। অপেক্ষার সময় আগের রিপোর্ট দেখতে পারেন।'],
    data_error: ['ড্যাশবোর্ডের তথ্য অসম্পূর্ণ', 'সম্পূর্ণ মিল, খরচ ও জমার হিসাব লোড করা যায়নি। কোনো পরিবর্তন করা হয়নি।'],
    retry: 'আবার চেষ্টা করুন',
    settings: 'ফ্ল্যাট সেটিংস দেখুন',
    reports: 'আগের রিপোর্ট দেখুন',
  },
} as const

export function DashboardState({ kind, canManage = false }: { kind: DashboardStateKind; canManage?: boolean }) {
  const { locale } = useI18n()
  const router = useRouter()
  const strings = copy[locale]
  const key = kind === 'no_cycle' ? (canManage ? 'no_cycle_manager' : 'no_cycle_member') : kind
  const [title, body] = strings[key]
  const isNoCycle = kind === 'no_cycle'

  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8">
      <div className="flex items-start gap-4">
        <span className="rounded-2xl bg-surface-3 p-3 text-brand-green">
          <AlertTriangle size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black tracking-tight text-main sm:text-2xl">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {!isNoCycle && (
              <button type="button" className="btn-primary" onClick={() => router.refresh()}>
                <RefreshCw size={15} /> {strings.retry}
              </button>
            )}
            {isNoCycle && canManage && (
              <Link href="/settings" className="btn-primary">
                <Settings size={15} /> {strings.settings} <ArrowRight size={14} />
              </Link>
            )}
            {isNoCycle && !canManage && (
              <Link href="/reports" className="btn-secondary">
                <History size={15} /> {strings.reports} <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
