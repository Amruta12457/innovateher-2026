/**
 * POST /api/transcribe
 * Accepts audio blob via form-data, returns { text, stt_provider, stt_status? }.
 * Supports Deepgram when STT_PROVIDER='deepgram' and STT_API_KEY present.
 * Falls back to mock otherwise. Never throws; always returns valid JSON.
 */

import { NextResponse } from 'next/server';

const MOCK_HINTS = [
  'Share an idea to revisit.',
  'Suggest an amplification phrase.',
  'Note something overlooked.',
  'Highlight a key point.',
  'Add a voice to the board.',
];

function getMockResponse(sttStatus?: string) {
  const time = new Date().toLocaleTimeString();
  const hint = MOCK_HINTS[Math.floor(Math.random() * MOCK_HINTS.length)];
  return {
    text: `Mock transcript chunk @ ${time}. Say: ${hint}`,
    stt_provider: 'mock' as const,
    ...(sttStatus && { stt_status: sttStatus }),
  };
}

async function transcribeWithDeepgram(
  audioBuffer: ArrayBuffer,
  contentType: string
): Promise<{ text: string; ok: true } | { ok: false; error?: string }> {
  const key = process.env.STT_API_KEY;
  if (!key) return { ok: false, error: 'STT_API_KEY missing' };

  const url = new URL('https://api.deepgram.com/v1/listen');
  url.searchParams.set('model', 'nova-2');
  url.searchParams.set('smart_format', 'true');

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Token ${key}`,
      'Content-Type': contentType || 'audio/webm',
    },
    body: audioBuffer,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[transcribe] Deepgram error:', res.status, errText);
    return { ok: false, error: `Deepgram ${res.status}` };
  }

  const data = (await res.json()) as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{ transcript?: string }>;
      }>;
    };
  };
  const transcript =
    data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? '';
  return { ok: true, text: transcript || '(no speech detected)' };
}

export async function POST(request: Request) {
  try {
    const provider = (process.env.STT_PROVIDER ?? 'mock').toLowerCase();
    const hasKey = Boolean(process.env.STT_API_KEY);

    let audioBuffer: ArrayBuffer | null = null;
    let contentType = 'audio/webm';

    const contentTypeHeader = request.headers.get('content-type');
    if (contentTypeHeader?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('audio');
      if (file instanceof Blob) {
        audioBuffer = await file.arrayBuffer();
        contentType = file.type || 'audio/webm';
      }
    } else if (contentTypeHeader?.startsWith('audio/')) {
      contentType = contentTypeHeader;
      audioBuffer = await request.arrayBuffer();
    }

    if (provider === 'deepgram' && hasKey && (!audioBuffer || audioBuffer.byteLength === 0)) {
      console.warn('[transcribe] Empty or missing audio blob, byteLength:', audioBuffer?.byteLength ?? 0);
    }
    if (provider === 'deepgram' && hasKey && audioBuffer && audioBuffer.byteLength > 0) {
      const result = await transcribeWithDeepgram(audioBuffer, contentType);
      if (result.ok) {
        return NextResponse.json({
          text: result.text,
          stt_provider: 'deepgram',
        });
      }
      console.error('[transcribe] Deepgram fallback:', result.error);
      return NextResponse.json(getMockResponse('mock_fallback'));
    }

    return NextResponse.json(getMockResponse());
  } catch (e) {
    console.error('[transcribe] Unexpected error:', e);
    return NextResponse.json(
      { ...getMockResponse('error'), stt_status: 'error' },
      { status: 200 }
    );
  }
}
