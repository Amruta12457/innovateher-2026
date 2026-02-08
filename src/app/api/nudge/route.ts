/**
 * POST /api/nudge
 * Input: { sessionId, transcriptSoFar?, transcriptChunks?, windowMinutes }
 * Uses last 2 segments of transcript for more context. transcriptChunks preferred when provided.
 * Output: { nudges: [{ title, owner?, interrupted_idea, rationale, suggested_phrase, confidence }] }
 * Uses Gemini when GEMINI_API_KEY set; otherwise returns mocked nudges.
 */

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export type NudgeItem = {
  type: 'idea_revisit';
  title: string;
  owner?: string;
  interrupted_idea?: string;
  rationale: string;
  suggested_phrase: string;
  confidence: number;
};

function parseNudgesJson(text: string): NudgeItem[] {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);
  const nudges = Array.isArray(parsed.nudges) ? parsed.nudges : Array.isArray(parsed) ? parsed : [];
  return nudges.map((n: Record<string, unknown>) => ({
    type: 'idea_revisit' as const,
    title: String(n.title ?? 'Voice to revisit'),
    owner: n.owner != null ? String(n.owner) : undefined,
    interrupted_idea: n.interrupted_idea != null ? String(n.interrupted_idea) : undefined,
    rationale: String(n.rationale ?? ''),
    suggested_phrase: String(n.suggested_phrase ?? "Let's revisit that."),
    confidence: typeof n.confidence === 'number' ? n.confidence : 0.8,
  }));
}

function getMockNudges(transcript: string): NudgeItem[] {
  const lines = transcript.split(/[.!?]\s+/).filter((s) => s.trim().length > 10);
  const phrase = lines[0]?.trim().slice(0, 50) || 'that idea';
  return [
    {
      type: 'idea_revisit',
      title: 'Possible interruption',
      interrupted_idea: phrase,
      rationale: 'Idea may not have been fully explored.',
      suggested_phrase: "Let's revisit that thought.",
      confidence: 0.7,
    },
  ];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sessionId,
      transcriptSoFar = '',
      transcriptChunks = [],
      windowMinutes = 10,
    } = body as {
      sessionId?: string;
      transcriptSoFar?: string;
      transcriptChunks?: string[];
      windowMinutes?: number;
    };

    const chunks = Array.isArray(transcriptChunks)
      ? transcriptChunks.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      : [];
    const fallbackTranscript = String(transcriptSoFar ?? '');

    const { segment1, segment2 } = (() => {
      const charLimit = 4000;
      if (chunks.length >= 2) {
        const mid = Math.floor(chunks.length / 2);
        const s1 = chunks.slice(0, mid).join(' ').slice(-charLimit);
        const s2 = chunks.slice(mid).join(' ');
        return {
          segment1: s1 || '(no earlier content)',
          segment2: s2.slice(-charLimit) || '(no recent content)',
        };
      }
      if (chunks.length === 1) {
        return { segment1: '(no earlier content)', segment2: chunks[0] };
      }
      const t = fallbackTranscript.slice(-8000);
      const mid = Math.floor(t.length / 2);
      return {
        segment1: t.slice(0, mid) || '(no content)',
        segment2: t.slice(mid) || '(no content)',
      };
    })();

    const transcript = fallbackTranscript || [...chunks].join(' ');
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      return NextResponse.json({ nudges: getMockNudges(transcript) });
    }

    const prompt = `You are a meeting equity assistant. Your job is to find IDEAS THAT WERE NOT EXPLORED ENOUGH—ideas that were mentioned or started but the conversation moved on before they could be fully developed. Often this is due to an interruption or abrupt topic change.

CONTEXT: This transcript is analyzed every 10 minutes. Within each segment, look for ideas that were cut short.

WHAT TO DETECT:
- An idea or topic is introduced (e.g. "Beaches are my favorite places")
- The conversation then jumps elsewhere before the idea is explored (e.g. "I really like Pokemon" with no bridge)
- Or: Someone starts a point but the topic changes before they finish
- Or: A promising idea is mentioned in one sentence and never returned to

EXAMPLE:
"Beaches are my favorite places to go. They are so pretty. I really like Pokemon. What do you think about Pokemon?"
→ Beaches was introduced but not explored; Pokemon suddenly takes over. "interrupted_idea" = "Beaches" or "Their favorite places / beaches".

ANALYZE EACH SEGMENT: Go through both segments. For each idea that seems under-explored (cut short, interrupted, or dropped), add a nudge. Build a list of all such ideas.

RULES:
- Return 0–3 nudges. Only include ideas that were genuinely under-explored, not fully discussed topics.
- "interrupted_idea" = the specific idea/topic that was not explored enough (e.g. "Beaches", "The Q3 budget concern", "Their point about the launch date"). Short. Never omit.
- title = "Possible interruption" for each.

Given these segments (last ${windowMinutes} min window), list all under-explored ideas.
Return STRICT JSON only. Every nudge MUST include "interrupted_idea".
{"nudges":[{"type":"idea_revisit","title":"Possible interruption","owner":"string or omit","interrupted_idea":"string (REQUIRED: the idea that was not explored enough)","rationale":"string","suggested_phrase":"string","confidence":0.0-1.0}]}

---
SEGMENT 1 (earlier in meeting):
${segment1}

---
SEGMENT 2 (recent):
${segment2}`;

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
