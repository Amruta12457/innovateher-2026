/**
 * POST /api/nudge
 * Input: { sessionId, transcriptSoFar?, transcriptChunks?, windowMinutes }
 * Uses last 2 segments of transcript for more context. transcriptChunks preferred when provided.
 * Output: { nudges: [{ title, owner?, interrupted_idea, rationale, suggested_phrase, confidence }] }
 * Uses OpenAI when OPENAI_API_KEY set; otherwise returns mocked nudges.
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export type NudgeItem = {
  type: 'idea_revisit';
  title: string;
  owner?: string;
  interrupted_idea?: string;
  extracted_ideas?: string[];
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
    extracted_ideas: Array.isArray(n.extracted_ideas) ? n.extracted_ideas.map(String) : undefined,
    rationale: String(n.rationale ?? ''),
    suggested_phrase: String(n.suggested_phrase ?? "Let's revisit that."),
    confidence: typeof n.confidence === 'number' ? n.confidence : 0.8,
  }));
}

function getMockNudges(transcript: string): NudgeItem[] {
  const lines = transcript.split(/[.!?]\s+/).filter((s) => s.trim().length > 10);
  const phrase = lines[0]?.trim().slice(0, 50) || 'that idea';
  const words = phrase.split(/\s+/).slice(0, 2);
  return [
    {
      type: 'idea_revisit',
      title: 'Possible interruption',
      interrupted_idea: phrase,
      extracted_ideas: words.length > 0 ? [words.join(' ')] : [phrase],
      rationale: 'Idea may not have been fully explored.',
      suggested_phrase: "Let's revisit that thought.",
      confidence: 0.7,
    },
  ];
}

export async function POST(request: Request) {
  console.log('[nudge] POST /api/nudge hit');
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
    const key = process.env.OPENAI_API_KEY;
    // Debug: show if key is seen (never log the key itself)
    console.log('[nudge] OPENAI_API_KEY present:', !!key, '| has .env keys:', Object.keys(process.env).filter((k) => k.includes('OPENAI') || k.includes('GEMINI')).join(', ') || 'none');

    if (!key) {
      console.log('[nudge] No OPENAI_API_KEY - returning mock nudges. Check: .env.local in project root, var name exactly OPENAI_API_KEY, no spaces around =, restart dev server');
      return NextResponse.json({ nudges: getMockNudges(transcript) });
    }

    const prompt = `You are a meeting equity assistant. STRICT RULES.

CRITICAL - NEVER NUDGE when:
- The transcript discusses ONE topic and people respond, agree, or reach a decision
- There is back-and-forth (What do you think? I agree. Good point. Sounds good. Anyone have concerns? No. Great, we'll move ahead.)
- The discussion reaches resolution or natural closure

EXAMPLE - MUST RETURN {"nudges":[]} (NEVER nudge for this or anything similar):
"Let's talk about the Q3 marketing budget. I think we should prioritize it since we've been underfunding it and competitors are outspending us. What do you all think? I agree, and I'd add that we need to decide by Friday. Good point. So let's say we increase it by twenty percent and revisit in October. Sounds good. Anyone have concerns? No, I'm good. Great, we'll move ahead with that."
→ Single topic, everyone contributed, agreed, resolved. Output: {"nudges":[]}

ONLY NUDGE when (rare):
- Topic A (e.g. beaches) is introduced, then UNRELATED Topic B (e.g. Pokemon) appears with ZERO connection
- Example: "Beaches are my favorite. They're so pretty. I really like Pokemon." → beaches cut short by Pokemon

STEP 1: If the transcript shows one topic with Q&A, agreement, or resolution → return {"nudges":[]} immediately.
STEP 2: Only if you see an abrupt jump from unrelated Topic A to unrelated Topic B, return 1 nudge.

Default: {"nudges":[]}. When in doubt: {"nudges":[]}.

Return STRICT JSON only. Either {"nudges":[]} or {"nudges":[{...}]}. Every nudge MUST include "interrupted_idea".
Transcript may use "Name: text" format for speaker attribution. Include "owner" with the speaker name when you can identify who introduced the interrupted idea.
{"nudges":[{"type":"idea_revisit","title":"Possible interruption","owner":"string or omit","interrupted_idea":"string (REQUIRED: the idea that was not explored enough)","rationale":"string","suggested_phrase":"string","confidence":0.0-1.0}]}

---
SEGMENT 1 (earlier in meeting):
${segment1}

---
SEGMENT 2 (recent):
${segment2}`;

    const openai = new OpenAI({ apiKey: key });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0]?.message?.content ?? '';
    console.log('[nudge] OpenAI raw response:', text);
    let nudges: NudgeItem[];
    try {
      nudges = parseNudgesJson(text);
    } catch {
      const retry = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt + '\n\nIMPORTANT: Return valid JSON only. No markdown, no extra text.' },
        ],
      });
      const retryText = retry.choices[0]?.message?.content ?? '';
      nudges = parseNudgesJson(retryText);
    }
    console.log('[nudge] Parsed nudges:', JSON.stringify(nudges), '| length:', nudges.length, '| empty:', nudges.length === 0);

    for (const n of nudges) {
      const topic = n.interrupted_idea?.trim();
      if (!topic) continue;
      try {
        const summaryRes = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: `You are a meeting equity assistant. A discussion was interrupted before an idea was fully explored.

TRANSCRIPT CONTEXT:
---
Earlier: ${segment1.slice(-1500)}
---
Recent: ${segment2.slice(-1500)}
---

INITIAL DETECTION: "${topic}"
Rationale: ${n.rationale ?? 'The idea was not fully explored.'}

TASK:
1. Identify the specific overlooked idea from the transcript context (the core thought that was cut short).
2. Summarize it in 1-2 clear sentences for a meeting facilitator, so they can bring this topic back. Be specific and actionable.

Output ONLY the summary. No preamble, no quotes, no labels.`,
            },
          ],
        });
        const summary = (summaryRes.choices[0]?.message?.content ?? '').trim();
        console.log('[nudge] OpenAI summary response (Topic that was interrupted):', summary);
        if (summary) n.interrupted_idea = summary;
      } catch {
        // keep original topic if description call fails
      }
      const descForExtract = n.interrupted_idea?.trim() || topic;
      try {
        const extractRes = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: `From this description of an interrupted meeting topic: "${descForExtract}"

Extract the main ideas as 1-2 word phrases (e.g. "Beaches", "Marketing budget", "Q3 timeline"). Return JSON only: {"ideas":["word1","word2"]}. Output ONLY valid JSON, no other text.`,
            },
          ],
        });
        const extractText = (extractRes.choices[0]?.message?.content ?? '').trim();
        console.log('[nudge] OpenAI extraction response (Idea Board):', extractText);
        const cleaned = extractText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned) as { ideas?: string[] };
        const ideas = Array.isArray(parsed?.ideas) ? parsed.ideas.filter((s): s is string => typeof s === 'string' && s.trim().length > 0) : [];
        if (ideas.length > 0) n.extracted_ideas = ideas;
      } catch {
        n.extracted_ideas = [topic.split(/\s+/).slice(0, 2).join(' ') || topic];
      }
    }

    return NextResponse.json({ nudges });
  } catch (e) {
    console.error('[nudge] Error:', e);
    const body = await request.json().catch(() => ({}));
    const transcript = String((body as { transcriptSoFar?: string })?.transcriptSoFar ?? '');
    return NextResponse.json({ nudges: getMockNudges(transcript) });
  }
}
