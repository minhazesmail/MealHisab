import { describe, expect, it } from 'vitest'
import { autoAssignCycleDate } from '../src/lib/dates'

describe('cycle date assignment', () => {
  it('clamps today when no explicit date is supplied', () => {
    const result = autoAssignCycleDate('2026-08-10', '2026-08-20')
    expect(result).toMatch(/^2026-08-(10|11|12|13|14|15|16|17|18|19|20)$/)
  })

  it('rejects an explicit date outside the cycle instead of rewriting it', () => {
    expect(() => autoAssignCycleDate('2026-08-10', '2026-08-20', '2026-08-21')).toThrow(
      'Date must be within this cycle (2026-08-10 to 2026-08-20).',
    )
  })

  it('accepts an explicit date inside the cycle unchanged', () => {
    expect(autoAssignCycleDate('2026-08-10', '2026-08-20', '2026-08-15')).toBe('2026-08-15')
  })
})
