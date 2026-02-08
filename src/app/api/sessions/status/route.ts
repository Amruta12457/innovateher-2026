/**
 * POST /api/sessions/status - update session status (mock mode)
 */

import { NextResponse } from 'next/server';
import { updateSessionStatus } from '@/lib/sessions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, status } = body as { sessionId?: string; status?: string };
    if (!sessionId || !status) {
      return NextResponse.json({ error: 'sessionId and status required' }, { status: 400 });
    }
    const session = await updateSessionStatus(sessionId, status);
    return NextResponse.json(session ?? { ok: false });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update' },
      { status: 500 }
    );
  }
}
