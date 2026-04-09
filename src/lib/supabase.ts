import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Browser client — uses anon key (singleton)
let browserClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (!browserClient) {
    browserClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}

// Server client — uses anon key for Server Components and Server Actions
export function createServerClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

// Admin client — uses service role key, bypasses RLS
// Only use in trusted server-side contexts (Server Actions, scripts)
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
