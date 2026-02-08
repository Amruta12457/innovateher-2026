/**
 * POST /api/sessions/status
 * Input: { sessionId, status }
 */

import { NextResponse } from 'next/server';
import { updateSessionStatus } from '@/lib/sessions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, status } = body as { sessionId?: string; status?: string };
    if (!sessionId || !status) {
      return NextResponse.json({ ok: false, error: 'sessionId and status required' }, { status: 400 });
    }
    const ok = await updateSessionStatus(sessionId, status);
    return NextResponse.json({ ok });
  } catch (e) {
    console.error('[sessions/status] Error:', e);
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 500 });
  }
}
