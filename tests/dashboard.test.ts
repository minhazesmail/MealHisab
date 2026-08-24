import { describe, expect, it } from 'vitest'
import { buildDashboardMembers } from '../src/lib/dashboard'

describe('dashboard accounting', () => {
  it('allocates all shared cycle costs into the meal rate', () => {
    const result = buildDashboardMembers({
      flat: { meal_policy: 'opt_in' },
      cycle: { start_date: '2026-08-19', end_date: '2026-08-19' },
      members: [
        {
          user_id: 'u1',
          opening_balance: 0,
          profiles: { full_name: 'Member One' },
          active_from: '2026-08-19',
          active_to: null,
        },
      ],
      logs: [
        { user_id: 'u1', date: '2026-08-19', meal_type: 'lunch', count: 1 },
        { user_id: 'u1', date: '2026-08-19', meal_type: 'dinner', count: 1 },
      ],
      contributions: [{ user_id: 'u1', amount: 0 }],
      totalCost: 1000,
    })

    expect(result[0].meals).toBe(2)
    expect(result[0].mealCost).toBe(1000)
    expect(result[0].balance).toBe(-1000)
  })
})
