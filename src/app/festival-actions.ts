'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { extractDbError } from '@/lib/db-errors'

export async function configureCycleMode(input: {
  cycleId: string
  cycleType: 'regular' | 'short' | 'eid' | 'festival'
  festivalName?: string
  festivalStartDate?: string
  festivalEndDate?: string
  mealsPaused: boolean
}) {
  const data = z.object({
    cycleId: z.string().uuid(),
    cycleType: z.enum(['regular','short','eid','festival']),
    festivalName: z.string().trim().max(120).optional(),
    festivalStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    festivalEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    mealsPaused: z.boolean(),
  }).parse(input)
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')
  await enforceRateLimit('configureCycleMode', user.id)
  const { error } = await supabase.rpc('configure_cycle_mode', {
    p_cycle_id: data.cycleId,
    p_cycle_type: data.cycleType,
    p_festival_name: data.festivalName || null,
    p_festival_start_date: data.festivalStartDate || null,
    p_festival_end_date: data.festivalEndDate || null,
    p_meals_paused: data.mealsPaused,
  })
  if (error) throw extractDbError(error, 'configureCycleMode')
  revalidatePath('/settings'); revalidatePath('/calendar'); revalidatePath('/meals'); revalidatePath('/dashboard'); revalidatePath('/expenses'); revalidatePath('/reports')
}
