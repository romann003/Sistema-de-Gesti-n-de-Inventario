import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (!supabaseClient) {
    const supabaseUrl = `https://${projectId}.supabase.co`;
    
    // Include the public anon key as both 'apikey' and Authorization Bearer so
    // requests made directly to the REST endpoint (or by the SDK's fetch) have
    // the expected header. It's safe to expose the public anon key in frontend
    // code.
    supabaseClient = createSupabaseClient(supabaseUrl, publicAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      },
    });
  }
  return supabaseClient;
}
