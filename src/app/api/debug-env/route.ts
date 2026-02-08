/**
 * Debug endpoint: check if OPENAI_API_KEY is loaded.
 * Visit http://localhost:3000/api/debug-env in the browser.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.OPENAI_API_KEY;
  return NextResponse.json({
    OPENAI_API_KEY: {
      set: !!key,
      length: key ? key.length : 0,
      prefix: key ? `${key.slice(0, 7)}...` : null,
    },
    hint: !key
      ? 'Add OPENAI_API_KEY=sk-xxx to .env.local in project root, then restart: npm run dev'
      : 'Key is loaded. Nudge API should work.',
  });
}
