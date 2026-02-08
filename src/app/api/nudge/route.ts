/**
 * POST /api/nudge
 * Input: { sessionId, transcriptSoFar, windowMinutes }
 * Output: { nudges: [{ title, owner?, rationale, suggested_phrase, confidence }] }
 * Uses Gemini when GEMINI_API_KEY set; otherwise returns mocked nudges.
 */

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export type NudgeItem = {
  title: string;
  owner?: string;
  rationale: string;
  suggested_phrase: string;
  confidence: number;
};

function parseNudgesJson(text: string): NudgeItem[] {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);
  const nudges = Array.isArray(parsed.nudges) ? parsed.nudges : Array.isArray(parsed) ? parsed : [];
  return nudges.map((n: Record<string, unknown>) => ({
    title: String(n.title ?? 'Voice to revisit'),
    owner: n.owner != null ? String(n.owner) : undefined,
    rationale: String(n.rationale ?? ''),
    suggested_phrase: String(n.suggested_phrase ?? "Let's revisit that."),
    confidence: typeof n.confidence === 'number' ? n.confidence : 0.8,
  }));
}

function getMockNudges(transcript: string): NudgeItem[] {
  const lines = transcript.split(/[.!?]\s+/).filter((s) => s.trim().length > 10);
  const phrase = lines[lines.length - 1]?.trim().slice(0, 50) || 'recent discussion';
  return [
    {
      title: 'Possible overlooked idea',
      rationale: `This point may have been missed: "${phrase}..."`,
      suggested_phrase: "Let's revisit that thought.",
      confidence: 0.75,
    },
    {
      title: 'Amplification opportunity',
      rationale: 'Consider explicitly crediting the speaker.',
      suggested_phrase: "I'd like to highlight what was just said.",
      confidence: 0.7,
    },
  ];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, transcriptSoFar = '', windowMinutes = 10 } = body as {
      sessionId?: string;
      transcriptSoFar?: string;
      windowMinutes?: number;
    };

    const transcript = String(transcriptSoFar ?? '');
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      return NextResponse.json({ nudges: getMockNudges(transcript) });
    }

    const prompt = `You are a meeting equity assistant. Focus ONLY on voice equity, recognition, overlooked ideas, and amplification phrases.
Avoid meeting summaries, decisions, action items. Use cautious language ("possible", "may have been missed").
Given this transcript (last ${windowMinutes} min window), suggest 1-3 "voices to revisit" nudges.
Return STRICT JSON only, no other text:
{"nudges":[{"title":"string","owner":"string or omit","rationale":"string","suggested_phrase":"string","confidence":0.0-1.0}]}

Transcript:
${transcript.slice(-4000)}`;

    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = (response as { text?: string })?.text ?? '';
    let nudges: NudgeItem[];
    try {
      nudges = parseNudgesJson(text);
    } catch {
      const retry = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt + '\n\nIMPORTANT: Return valid JSON only. No markdown, no extra text.',
      });
      const retryText = (retry as { text?: string })?.text ?? '';
      nudges = parseNudgesJson(retryText);
    }

    return NextResponse.json({ nudges });
  } catch (e) {
    console.error('[nudge] Error:', e);
    const body = await request.json().catch(() => ({}));
    const transcript = String((body as { transcriptSoFar?: string })?.transcriptSoFar ?? '');
    return NextResponse.json({ nudges: getMockNudges(transcript) });
  }
}
