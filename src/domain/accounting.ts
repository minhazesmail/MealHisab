import { eachDayOfInterval, isAfter, isBefore, parseISO } from 'date-fns'

export type MealPolicy = 'opt_out' | 'opt_in'
export type MealType = 'lunch' | 'dinner' | 'extra'

export interface MealOverride {
  userId: string
  date: string
  mealType: MealType
  count: number
}

export interface CycleMember {
  userId: string
  joinedDate: string
  leftDate?: string | null
}

export interface MemberSettlementInput {
  userId: string
  mealCount: number
  contribution: number
  openingBalance: number
  guestCharge?: number
}

export interface MemberSettlement {
  userId: string
  mealCount: number
  mealCost: number
  contribution: number
  openingBalance: number
  guestCharge: number
  closingBalance: number
}

export function effectiveMealCount(
  policy: MealPolicy,
  memberId: string,
  date: string,
  mealType: MealType,
  overrides: Map<string, MealOverride>,
): number {
  const key = `${memberId}:${date}:${mealType}`
  const override = overrides.get(key)
  if (mealType === 'extra') return override?.count ?? 0
  if (policy === 'opt_out') return override ? override.count : 1
  return override?.count ?? 0
}

export function isMemberPresentOnDate(member: CycleMember, date: string): boolean {
  const d = parseISO(date)
  const joined = parseISO(member.joinedDate)
  if (isBefore(d, joined)) return false
  if (member.leftDate && isAfter(d, parseISO(member.leftDate))) return false
  return true
}

export function calculateMemberMeals(
  policy: MealPolicy,
  member: CycleMember,
  startDate: string,
  endDate: string,
  overrides: Map<string, MealOverride>,
): number {
  let total = 0
  for (const day of eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })) {
    const date = day.toISOString().slice(0, 10)
    if (!isMemberPresentOnDate(member, date)) continue
    total += effectiveMealCount(policy, member.userId, date, 'lunch', overrides)
    total += effectiveMealCount(policy, member.userId, date, 'dinner', overrides)
    total += effectiveMealCount(policy, member.userId, date, 'extra', overrides)
  }
  return total
}

export function calculateMealRate(totalCost: number, totalMeals: number): number {
  if (totalMeals <= 0) return 0
  return roundMoney(totalCost / totalMeals)
}

export function calculateSettlements(
  inputs: MemberSettlementInput[],
  totalCost: number,
  totalMeals: number,
): MemberSettlement[] {
  if (inputs.length === 0) return []

  const rate = calculateMealRate(totalCost, totalMeals)
  const preliminary = inputs.map((input) => ({
    ...input,
    guestCharge: roundMoney(input.guestCharge ?? 0),
    mealCost: roundMoney(input.mealCount * rate),
  }))

  // Reconcile rounding drift into the member carrying the most meals so the
  // ledger balances exactly without charging a zero-meal member a residual.
  const allocated = preliminary.reduce((sum, item) => sum + item.mealCost, 0)
  const residual = roundMoney(totalCost - allocated)
  const adjustmentIndex = preliminary.reduce((best, item, index, all) => {
    const bestMeals = all[best]?.mealCount ?? -1
    return item.mealCount > bestMeals ? index : best
  }, 0)

  return preliminary.map((input, index) => {
    const mealCost = index === adjustmentIndex ? roundMoney(input.mealCost + residual) : input.mealCost
    const closingBalance = roundMoney(input.openingBalance + input.contribution - mealCost - input.guestCharge)
    return { ...input, mealCost, closingBalance }
  })
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
