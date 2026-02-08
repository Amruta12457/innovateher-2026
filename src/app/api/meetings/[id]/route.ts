/**
 * GET /api/meetings/[id] - fetch single meeting
 */

import { NextResponse } from 'next/server';
import { getMeetingById } from '@/lib/meetings';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const meeting = await getMeetingById(id);
    if (!meeting) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(meeting);
  } catch (e) {
    console.error('[meetings] GET by id error:', e);
    return NextResponse.json({ error: 'Failed to fetch meeting' }, { status: 500 });
  }
}
