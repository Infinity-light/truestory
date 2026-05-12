// Client-safe Supabase module — ONLY exports anon-key client.
// Server-only admin client (uses SUPABASE_SERVICE_ROLE_KEY) lives in `lib/supabase-server.ts`.
// DO NOT add supabaseAdmin or any service_role usage here — doing so will leak the key
// into the browser bundle and crash with "supabaseKey is required" at module evaluation.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
