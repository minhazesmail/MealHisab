const DEFAULT_SUPABASE_URL = 'https://uabfyijqhroonlhyercn.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_AKeO8PAwMMDUCWIyu8PcmQ_bevpMWz8'

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY

  return { url, publishableKey }
}
