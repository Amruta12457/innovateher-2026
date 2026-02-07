/**
 * Debug endpoint: returns whether Supabase is configured.
 * Visit /api/debug-supabase in the browser to verify env vars are loaded.
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const client = getSupabase();
  return NextResponse.json({
    configured: client !== null,
    hasUrl,
    hasKey,
    message:
      client
        ? 'Supabase is configured. Sessions will persist in the database.'
        : 'Supabase is NOT configured. Missing or invalid env vars. App is in mock mode.',
  });
}
