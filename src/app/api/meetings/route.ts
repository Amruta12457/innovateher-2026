/**
 * GET /api/meetings - list meetings
 * POST /api/meetings - create meeting (used internally; prefer createMeeting from lib)
 */

import { NextResponse } from 'next/server';
import { getMeetings, createMeeting } from '@/lib/meetings';

export async function GET() {
  try {
    const meetings = await getMeetings();
    return NextResponse.json(meetings);
  } catch (e) {
    console.error('[meetings] GET error:', e);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, transcript, reflection } = body as {
      sessionId?: string;
      transcript?: string;
      reflection?: Record<string, unknown>;
    };
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    const meeting = await createMeeting(
      sessionId,
      String(transcript ?? ''),
      reflection ?? {}
    );
    return NextResponse.json(meeting);
  } catch (e) {
    console.error('[meetings] POST error:', e);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}
