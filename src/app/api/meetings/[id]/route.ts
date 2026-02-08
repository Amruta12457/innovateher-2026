/**
 * GET /api/meetings/[id] - get single meeting (mock mode)
 */

import { NextResponse } from 'next/server';
import { getMeetingByIdMock } from '@/lib/mock-meetings';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const meeting = getMeetingByIdMock(id);
    if (!meeting) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(meeting);
  } catch {
    return NextResponse.json(null, { status: 404 });
  }
}
