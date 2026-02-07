/**
 * API route for creating sessions in mock mode (when Supabase is not configured).
 * Called from the client when createSession() detects no Supabase.
 */

import { NextResponse } from 'next/server';
import { createSessionMock } from '@/lib/mock-sessions';
import { generateSessionCode } from '@/lib/session-code';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, host_name } = body as { code?: string; host_name?: string };
    const hostName = host_name ?? 'Host';
    const sessionCode = typeof code === 'string' && code ? code : generateSessionCode();
    const session = createSessionMock(sessionCode, hostName);
    return NextResponse.json(session);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}
