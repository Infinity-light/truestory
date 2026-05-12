import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Browser-safe client using the anon key (respects Row Level Security)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-only admin client using the service role key (bypasses RLS)
// Never expose this to the browser — only import from API routes / server components
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
