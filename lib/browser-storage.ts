import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Browser-side storage client, used only to upload to signed URLs minted by the server.
 * One shared instance — creating a client per component triggers Supabase's
 * "Multiple GoTrueClient instances" warning.
 */
export function browserStorage() {
  if (!_client) {
    _client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return _client.storage;
}
