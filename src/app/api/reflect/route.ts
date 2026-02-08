/**
 * POST /api/reflect
 * Input: { sessionId, transcript, interruptionEvents? }
 * Output: Shine Reflection Report JSON.
 * Uses OpenAI when OPENAI_API_KEY set; otherwise returns mocked reflection.
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export type InterruptionEvent = {
  timestamp?: string;
  confidence?: 'low' | 'medium';
  rationale?: string;
};

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
    status: string;
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
  interruption_summary: {
    total_overlap_events: number;
    patterns: string[];
    facilitation_suggestions: string[];
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
  interruption_summary: {
    total_overlap_events: 0,
    patterns: [],
    facilitation_suggestions: ['Pause before switching topics to allow others to finish.'],
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
  const i = parsed.interruption_summary ?? {};
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
    interruption_summary: {
      total_overlap_events: typeof i.total_overlap_events === 'number' ? i.total_overlap_events : 0,
      patterns: Array.isArray(i.patterns) ? i.patterns : [],
      facilitation_suggestions: Array.isArray(i.facilitation_suggestions) ? i.facilitation_suggestions : [],
    },
    try_next_time: Array.isArray(parsed.try_next_time) ? parsed.try_next_time : [],
    amplification_toolkit: Array.isArray(parsed.amplification_toolkit) ? parsed.amplification_toolkit : [],
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, transcript = '', interruptionEvents = [] } = body as {
      sessionId?: string;
      transcript?: string;
      interruptionEvents?: InterruptionEvent[];
    };
    const transcriptStr = String(transcript ?? '');
    const events = Array.isArray(interruptionEvents) ? interruptionEvents : [];
    const key = process.env.OPENAI_API_KEY;

    if (!key) {
      const mock = { ...MOCK_REFLECTION };
      mock.interruption_summary.total_overlap_events = events.length;
      if (events.length > 0) {
        mock.interruption_summary.patterns = ['Audio energy overlap detected during speaking.'];
        mock.interruption_summary.facilitation_suggestions = [
          'Pause before switching topics to allow others to finish.',
          '"Sorry, go ahead" if overlap was you interrupting.',
        ];
      }
      return NextResponse.json(mock);
    }

    const interruptStr = events.length > 0
      ? `\nInterruption events (${events.length}): ${JSON.stringify(events.slice(-20))}`
      : '';

    const prompt = `You are a meeting equity analyst. Generate a Shine Reflection Report. NOT a recap or summarizer. No action items or decisions.
Focus on: voice equity, recognition, overlooked ideas, amplification, interruption patterns. Tone-safe and constructive.
Return STRICT JSON only:
{
  "voices_to_revisit": [{"idea":"string","introduced_by":"string?","what_happened":"string","suggested_phrases":["string"]}],
  "idea_flow": [{"idea":"string","introduced_by":"string?","mentions_estimate":number,"status":"built_upon|dropped|ongoing|reframed","notes":"string"}],
  "recognition_patterns": {"explicit_credit_examples":["string"],"missed_credit_opportunities":["string"],"overall_note":"string"},
  "participation_notes": {"observations":["string"],"facilitation_prompts":["string"]},
  "interruption_summary": {"total_overlap_events":number,"patterns":["string"],"facilitation_suggestions":["string"]},
  "try_next_time":["string"],
  "amplification_toolkit":["string"]
}

Transcript:
${transcriptStr.slice(-8000)}${interruptStr}`;

    const openai = new OpenAI({ apiKey: key });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0]?.message?.content ?? '';
    let reflection: Reflection;
    try {
      reflection = parseReflectionJson(text);
    } catch {
      const retry = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt + '\n\nIMPORTANT: Return valid JSON only. No markdown.' },
        ],
      });
      reflection = parseReflectionJson(retry.choices[0]?.message?.content ?? '{}');
    }

    return NextResponse.json(reflection);
  } catch (e) {
    console.error('[reflect] Error:', e);
    return NextResponse.json(MOCK_REFLECTION);
  }
}
