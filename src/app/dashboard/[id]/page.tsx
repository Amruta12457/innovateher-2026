import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMeetingById } from '@/lib/meetings';
import CopyButton from './CopyButton';

type Reflection = {
  voices_to_revisit?: Array<{
    idea?: string;
    introduced_by?: string;
    what_happened?: string;
    suggested_phrases?: string[];
  }>;
  idea_flow?: Array<{
    idea?: string;
    introduced_by?: string;
    mentions_estimate?: number;
    status?: string;
    notes?: string;
  }>;
  recognition_patterns?: {
    explicit_credit_examples?: string[];
    missed_credit_opportunities?: string[];
    overall_note?: string;
  };
  participation_notes?: {
    observations?: string[];
    facilitation_prompts?: string[];
  };
  interruption_summary?: {
    total_overlap_events?: number;
    patterns?: string[];
    facilitation_suggestions?: string[];
  };
  try_next_time?: string[];
  amplification_toolkit?: string[];
};

export default async function MeetingReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meeting = await getMeetingById(id);
  if (!meeting) notFound();

  const r = (meeting.reflection ?? {}) as Reflection;
  const voices = r.voices_to_revisit ?? [];
  const ideaFlow = r.idea_flow ?? [];
  const recog = r.recognition_patterns ?? {};
  const part = r.participation_notes ?? {};
  const interrupt = r.interruption_summary ?? {};
  const tryNext = r.try_next_time ?? [];
  const toolkit = r.amplification_toolkit ?? [];
  const code = (meeting.reflection as { _sessionCode?: string })?._sessionCode ?? '—';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <header className="p-4 border-b border-amber-200/60 bg-white/80 backdrop-blur">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-amber-900">Shine Reflection Report</h1>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-amber-700 hover:text-amber-900 font-medium text-sm">
              ← Dashboard
            </Link>
            <Link href="/" className="text-amber-700 hover:text-amber-900 font-medium text-sm">
              New session
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        <p className="text-amber-700 text-sm">Session: {code} · {new Date(meeting.created_at).toLocaleString()}</p>

        {/* 1. Voices to Revisit */}
        <section className="bg-white/80 rounded-xl border border-amber-200/60 p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-4">Voices to Revisit</h2>
          {voices.length === 0 ? (
            <p className="text-amber-600/80 text-sm">No items.</p>
          ) : (
            <div className="space-y-4">
              {voices.map((v, i) => (
                <div key={i} className="p-4 rounded-lg bg-amber-50/80 border border-amber-200/40">
                  <h3 className="font-medium text-amber-900">{v.idea ?? '—'}</h3>
                  {v.introduced_by && <p className="text-xs text-amber-700 mt-1">— {v.introduced_by}</p>}
                  <p className="text-sm text-amber-800 mt-2">{v.what_happened ?? ''}</p>
                  {Array.isArray(v.suggested_phrases) && v.suggested_phrases.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {v.suggested_phrases.map((phrase, j) => (
                        <span key={j} className="flex items-center gap-1">
                          <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 text-sm italic">&ldquo;{phrase}&rdquo;</span>
                          <CopyButton text={phrase} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2. Idea Flow & Ownership */}
        <section className="bg-white/80 rounded-xl border border-amber-200/60 p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-4">Idea Flow & Ownership</h2>
          {ideaFlow.length === 0 ? (
            <p className="text-amber-600/80 text-sm">No items.</p>
          ) : (
            <ul className="space-y-2">
              {ideaFlow.map((item, i) => (
                <li key={i} className="flex justify-between items-start p-2 rounded bg-amber-50/80">
                  <div>
                    <span className="font-medium text-amber-900">{item.idea ?? '—'}</span>
                    {item.introduced_by && <span className="text-amber-700 text-sm ml-1">({item.introduced_by})</span>}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-100">{item.status ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 3. Recognition & Amplification Patterns */}
        <section className="bg-white/80 rounded-xl border border-amber-200/60 p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-4">Recognition & Amplification Patterns</h2>
          <div className="space-y-3">
            {Array.isArray(recog.explicit_credit_examples) && recog.explicit_credit_examples.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-800">Explicit credit examples</h4>
                <ul className="list-disc list-inside text-sm text-amber-800">
                  {recog.explicit_credit_examples.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(recog.missed_credit_opportunities) && recog.missed_credit_opportunities.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-800">Missed credit opportunities</h4>
                <ul className="list-disc list-inside text-sm text-amber-800">
                  {recog.missed_credit_opportunities.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {recog.overall_note && <p className="text-sm text-amber-800 italic">{recog.overall_note}</p>}
          </div>
        </section>

        {/* 4. Interruption Patterns (new) */}
        <section className="bg-white/80 rounded-xl border border-amber-200/60 p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-4">Interruption Patterns</h2>
          <div className="space-y-3">
            <p className="text-sm text-amber-800">
              Total overlap events detected: <strong>{interrupt.total_overlap_events ?? 0}</strong>
            </p>
            {Array.isArray(interrupt.patterns) && interrupt.patterns.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-800">Patterns</h4>
                <ul className="list-disc list-inside text-sm text-amber-800">
                  {interrupt.patterns.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(interrupt.facilitation_suggestions) && interrupt.facilitation_suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-800">Facilitation suggestions</h4>
                <ul className="list-disc list-inside text-sm text-amber-800">
                  {interrupt.facilitation_suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {(!interrupt.patterns?.length && !interrupt.facilitation_suggestions?.length && (interrupt.total_overlap_events ?? 0) === 0) && (
              <p className="text-amber-600/80 text-sm">No overlap events detected in this meeting.</p>
            )}
          </div>
        </section>

        {/* 5. Participation Notes */}
        <section className="bg-white/80 rounded-xl border border-amber-200/60 p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-4">Participation Notes</h2>
          <div className="space-y-3">
            {Array.isArray(part.observations) && part.observations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-800">Observations</h4>
                <ul className="list-disc list-inside text-sm text-amber-800">
                  {part.observations.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(part.facilitation_prompts) && part.facilitation_prompts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-800">Facilitation prompts</h4>
                <ul className="list-disc list-inside text-sm text-amber-800">
                  {part.facilitation_prompts.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* 6. Try This Next Time */}
        <section className="bg-white/80 rounded-xl border border-amber-200/60 p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-4">Try This Next Time</h2>
          {tryNext.length === 0 ? (
            <p className="text-amber-600/80 text-sm">No suggestions.</p>
          ) : (
            <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
              {tryNext.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </section>

        {/* 7. Amplification Toolkit */}
        <section className="bg-white/80 rounded-xl border border-amber-200/60 p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-4">Amplification Toolkit</h2>
          {toolkit.length === 0 ? (
            <p className="text-amber-600/80 text-sm">No phrases.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {toolkit.map((phrase, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="px-3 py-2 rounded-lg bg-amber-100 text-amber-900 text-sm italic">&ldquo;{phrase}&rdquo;</span>
                  <CopyButton text={phrase} />
                </span>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
