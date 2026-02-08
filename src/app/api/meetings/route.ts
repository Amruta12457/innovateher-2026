/**
 * GET /api/meetings - list meetings (mock mode)
 * POST /api/meetings - create meeting (mock mode)
 */

import { NextResponse } from 'next/server';
import { createMeetingMock, getMeetingsMock } from '@/lib/mock-meetings';

export async function GET() {
  try {
    const meetings = getMeetingsMock();
    return NextResponse.json(meetings);
  } catch (e) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_id, transcript, reflection } = body as {
      session_id?: string | null;
      transcript?: string;
      reflection?: Record<string, unknown>;
    };
    const meeting = createMeetingMock(
      session_id ?? null,
      String(transcript ?? ''),
      reflection ?? {}
    );
    return NextResponse.json(meeting);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create meeting' },
      { status: 500 }
    );
  }
}
