import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://supabase-api-prod.verdent.ai/p/p5e38a353feb45f89776d'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMTA0MzA5NjUwLCJpYXQiOjE3ODg2OTA0NTAsImlzcyI6InN1cGFiYXNlIiwicHJvamVjdF9yZWYiOiJwNWUzOGEzNTNmZWI0NWY4OTc3NmQiLCJyb2xlIjoiYW5vbiJ9.f8Ex8dD0l2CyKeZJd-wKp9SXiN38aAfBobNLYI9nEOI'

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
