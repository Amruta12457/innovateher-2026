/**
 * POST /api/reflect
 * Input: { sessionId, transcript }
 * Output: reflection JSON for Shine Report.
 * Uses Gemini when GEMINI_API_KEY set; otherwise returns mocked reflection.
 */

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export type Reflection = {
  voices_to_revisit: Array<{
    idea: string;
    introduced_by?: string;
    what_happened: string;
    suggested_phrases: string[];
  }>;
  idea_flow: Array<{
    idea: string;
    introduced_by?: string;
    mentions_estimate: number;
    status: 'built_upon' | 'dropped' | 'ongoing' | 'reframed';
    notes: string;
  }>;
  recognition_patterns: {
    explicit_credit_examples: string[];
    missed_credit_opportunities: string[];
    overall_note: string;
  };
  participation_notes: {
    observations: string[];
    facilitation_prompts: string[];
  };
  try_next_time: string[];
  amplification_toolkit: string[];
};

const MOCK_REFLECTION: Reflection = {
  voices_to_revisit: [
    {
      idea: 'A possible overlooked suggestion',
      what_happened: 'Mentioned briefly; may be worth revisiting.',
      suggested_phrases: ["Let's circle back to that.", 'Could you expand on that idea?'],
    },
  ],
  idea_flow: [
    {
      idea: 'Main discussion thread',
      mentions_estimate: 3,
      status: 'ongoing',
      notes: 'Central to the conversation.',
    },
  ],
  recognition_patterns: {
    explicit_credit_examples: ['Team member acknowledged contributions.'],
    missed_credit_opportunities: ['Consider naming who introduced key ideas.'],
    overall_note: 'Constructive meeting; room to amplify voices.',
  },
  participation_notes: {
    observations: ['Good participation from several voices.'],
    facilitation_prompts: ['Invite quieter voices: "What do others think?"'],
  },
  try_next_time: ['Use amplification phrases more often.', 'Pause before moving to next topic.'],
  amplification_toolkit: [
    "I'd like to highlight what was just said.",
    "Let's build on that idea.",
    "Thank you for raising that.",
  ],
};

function parseReflectionJson(text: string): Reflection {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);
  const r = parsed.recognition_patterns ?? {};
  const p = parsed.participation_notes ?? {};
  return {
    voices_to_revisit: Array.isArray(parsed.voices_to_revisit) ? parsed.voices_to_revisit : MOCK_REFLECTION.voices_to_revisit,
    idea_flow: Array.isArray(parsed.idea_flow) ? parsed.idea_flow : MOCK_REFLECTION.idea_flow,
    recognition_patterns: {
      explicit_credit_examples: Array.isArray(r.explicit_credit_examples) ? r.explicit_credit_examples : [],
      missed_credit_opportunities: Array.isArray(r.missed_credit_opportunities) ? r.missed_credit_opportunities : [],
      overall_note: String(r.overall_note ?? ''),
    },
    participation_notes: {
      observations: Array.isArray(p.observations) ? p.observations : [],
      facilitation_prompts: Array.isArray(p.facilitation_prompts) ? p.facilitation_prompts : [],
    },
    try_next_time: Array.isArray(parsed.try_next_time) ? parsed.try_next_time : [],
    amplification_toolkit: Array.isArray(parsed.amplification_toolkit) ? parsed.amplification_toolkit : [],
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, transcript = '' } = body as { sessionId?: string; transcript?: string };
    const transcriptStr = String(transcript ?? '');
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      return NextResponse.json(MOCK_REFLECTION);
    }

    const prompt = `You are a meeting equity analyst. Generate a Shine Reflection Report. NOT a recap or summarizer. No action items or decisions.
Focus on: voice equity, recognition, overlooked ideas, amplification. Tone-safe and constructive.
Return STRICT JSON only:
{
  "voices_to_revisit": [{"idea":"string","introduced_by":"string?","what_happened":"string","suggested_phrases":["string"]}],
  "idea_flow": [{"idea":"string","introduced_by":"string?","mentions_estimate":number,"status":"built_upon|dropped|ongoing|reframed","notes":"string"}],
  "recognition_patterns": {"explicit_credit_examples":["string"],"missed_credit_opportunities":["string"],"overall_note":"string"},
  "participation_notes": {"observations":["string"],"facilitation_prompts":["string"]},
  "try_next_time":["string"],
  "amplification_toolkit":["string"]
}

Transcript:
${transcriptStr.slice(-8000)}`;

    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = (response as { text?: string })?.text ?? '';
    let reflection: Reflection;
    try {
      reflection = parseReflectionJson(text);
    } catch {
      const retry = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt + '\n\nIMPORTANT: Return valid JSON only. No markdown.',
      });
      reflection = parseReflectionJson((retry as { text?: string })?.text ?? '{}');
    }

    return NextResponse.json(reflection);
  } catch (e) {
    console.error('[reflect] Error:', e);
    return NextResponse.json(MOCK_REFLECTION);
  }
}
