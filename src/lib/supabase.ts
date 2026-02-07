/**
 * Supabase client helper.
 * When NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing,
 * returns null - the app runs in "local mock mode" using localStorage.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null | undefined = undefined;

export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    _client = null;
    return null;
  }

  _client = createClient(url, key);
  return _client;
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}
