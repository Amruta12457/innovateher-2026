/**
 * POST /api/transcribe
 * Accepts audio blob via form-data, returns { text: string }.
 * Mock mode when STT_PROVIDER='mock' or STT_API_KEY missing.
 */

import { NextResponse } from 'next/server';

const MOCK_HINTS = [
  'Share an idea to revisit.',
  'Suggest an amplification phrase.',
  'Note something overlooked.',
  'Highlight a key point.',
  'Add a voice to the board.',
];

export async function POST(request: Request) {
  try {
    const provider = (process.env.STT_PROVIDER ?? 'mock').toLowerCase();
    const hasKey = Boolean(process.env.STT_API_KEY);

    const useMock = provider === 'mock' || !hasKey;

    const effectiveProvider = useMock ? 'mock' : provider;
    const time = new Date().toLocaleTimeString();
    const hint = MOCK_HINTS[Math.floor(Math.random() * MOCK_HINTS.length)];
    return NextResponse.json({
      text: `Mock transcript chunk @ ${time}. Say: ${hint}`,
      stt_provider: effectiveProvider,
    });
  } catch {
    return NextResponse.json(
      { text: 'Transcript unavailable.', stt_provider: 'mock' },
      { status: 200 }
    );
  }
}
