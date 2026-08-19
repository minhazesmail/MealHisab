const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uabfyijqhroonlhyercn.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_AKeO8PAwMMDUCWIyu8PcmQ_bevpMWz8'

export function getSupabaseConfig() {
  return { url: SUPABASE_URL, publishableKey: SUPABASE_PUBLISHABLE_KEY }
}
