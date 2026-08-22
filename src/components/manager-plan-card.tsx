import { ManualPaymentCard } from '@/components/manual-payment-card'

export function ManagerPlanCard({ status, periodEnd, hasFlat, paymentStatus }: { status: string; periodEnd: string | null; hasFlat: boolean; paymentStatus?: string | null }) {
  const active = ['active', 'trialing'].includes(status) && !!periodEnd && new Date(periodEnd) > new Date()
  return <ManualPaymentCard active={active} periodEnd={periodEnd} paymentStatus={paymentStatus}/>
}
