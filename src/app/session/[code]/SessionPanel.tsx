'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { fetchEvents, insertEvent, type EventRow } from '@/lib/events';

type Session = {
  id: string;
  code: string;
  status: string;
};

type NudgePayload = {
  title?: string;
  owner?: string;
  rationale?: string;
  suggested_phrase?: string;
  confidence?: number;
};

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

const CHUNK_MS = 10_000; // 10 seconds

export default function SessionPanel({
  session,
  role,
  name,
}: {
  session: Session;
  role: string;
  name: string;
}) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listening, setListening] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [transcribeWarning, setTranscribeWarning] = useState<string | null>(null);
  const [manualNote, setManualNote] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const transcriptChunks = dedupeById(
    events.filter((e) => e.type === 'transcript_chunk')
  );
  const nudges = dedupeById(events.filter((e) => e.type === 'nudge'));
  const ideaBoard = nudges.map((e) => {
    const p = e.payload as NudgePayload;
    return {
      id: e.id,
      title: p.title ?? 'Untitled',
      owner: p.owner ?? '',
      status: p.confidence != null ? `${Math.round((p.confidence ?? 0) * 100)}%` : '',
    };
  });

  const handleEvents = useCallback((newEvents: EventRow[]) => {
    setEvents((prev) => {
      const merged = [...prev];
      const ids = new Set(prev.map((e) => e.id));
      for (const e of newEvents) {
        if (!ids.has(e.id)) {
          ids.add(e.id);
          merged.push(e);
        }
      }
      merged.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return merged.slice(-50);
    });
  }, []);

  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const initial = await fetchEvents(session.id);
        if (!cancelled) setEvents(initial);
      } catch (e) {
        if (!cancelled) console.error('Failed to fetch events:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (cancelled) return;
      const { subscribeToEvents } = await import('@/lib/events');
      const unsub = subscribeToEvents(session.id, handleEvents);
      unsubRef.current = unsub;
      if (cancelled) unsub();
    }

    init();

    return () => {
      cancelled = true;
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [session.id, handleEvents]);

  const transcribeChunk = useCallback(
    async (blob: Blob) => {
      try {
        setTranscribeWarning(null);
        const form = new FormData();
        form.append('audio', blob);
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: form,
        });
        const data = await res.json();
        const text = data?.text ?? 'Transcript unavailable.';
        const sttProvider = data?.stt_provider ?? 'mock';
        const payload: Record<string, unknown> = {
          text,
          ts: new Date().toISOString(),
          source: 'mic',
          stt_provider: sttProvider,
        };
        if (data?.stt_status) payload.stt_status = data.stt_status;
        await insertEvent(session.id, 'transcript_chunk', payload);
      } catch (e) {
        setTranscribeWarning('Transcript failed. Try typing a note.');
      }
    },
    [session.id]
  );

  const startListening = useCallback(async () => {
    try {
      setMicDenied(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          await transcribeChunk(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
      };

      recorder.start(CHUNK_MS);
      setListening(true);
    } catch (e) {
      setMicDenied(true);
      setListening(false);
    }
  }, [transcribeChunk]);

  const stopListening = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.requestData();
      recorder.stop();
    }
    setListening(false);
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  const copyLink = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url);
  };

  const addManualNote = async () => {
    const text = manualNote.trim();
    if (!text) return;
    try {
      await insertEvent(session.id, 'transcript_chunk', {
        text,
        ts: new Date().toISOString(),
        source: 'manual',
      });
      setManualNote('');
    } catch (e) {
      console.error('Failed to add note:', e);
    }
  };

  const addTestTranscript = async () => {
    try {
      await insertEvent(session.id, 'transcript_chunk', {
        text: 'Test chunk from host at ' + new Date().toLocaleTimeString(),
        ts: new Date().toISOString(),
        source: 'test',
      });
    } catch (e) {
      console.error('Failed to add transcript chunk:', e);
    }
  };

  const addTestNudge = async () => {
    try {
      await insertEvent(session.id, 'nudge', {
        title: 'Amplify this idea',
        owner: name,
        rationale: 'Strong point worth highlighting',
        suggested_phrase: "Let's revisit that thought",
        confidence: 0.9,
      });
    } catch (e) {
      console.error('Failed to add nudge:', e);
    }
  };

  const clearLocalView = () => {
    setEvents([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <p className="text-amber-700">Loading session…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white/80 backdrop-blur border-b border-amber-200/60">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-amber-900">{session.code}</h1>
          <button
            onClick={copyLink}
            className="px-3 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium"
          >
            Copy link
          </button>
          {role === 'host' && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                listening
                  ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  listening ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              {listening ? 'Listening' : 'Not listening'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              role === 'host'
                ? 'bg-amber-200 text-amber-900'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {role}
          </span>
          <span className="text-sm text-amber-700">{name}</span>
        </div>
      </header>

      {/* Mic denied banner */}
      {role === 'host' && micDenied && (
        <div className="px-4 py-2 bg-amber-100 border-b border-amber-200 text-amber-900 text-sm">
          Mic access denied. Use &ldquo;Type a note&rdquo; below to add transcript manually.
        </div>
      )}

      {/* Transcribe warning */}
      {role === 'host' && transcribeWarning && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
          {transcribeWarning}
        </div>
      )}

      {/* Host-only controls */}
      {role === 'host' && (
        <div className="p-4 flex flex-wrap gap-2 border-b border-amber-200/40">
          {!listening ? (
            <button
              onClick={startListening}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold border-2 border-emerald-900 shadow-md"
            >
              Start Listening
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-sm font-semibold border-2 border-rose-900 shadow-md"
            >
              Stop Listening
            </button>
          )}
          <button
            onClick={addTestTranscript}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium"
          >
            Add test transcript chunk
          </button>
          <button
            onClick={addTestNudge}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium"
          >
            Add test nudge
          </button>
          <button
            onClick={clearLocalView}
            className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium"
          >
            Clear local view
          </button>
        </div>
      )}

      {/* Type a note (host fallback) */}
      {role === 'host' && (
        <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-amber-200/40 bg-white/60">
          <input
            type="text"
            placeholder="Type a note..."
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addManualNote()}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-amber-200 bg-white text-amber-900 placeholder-amber-400 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
          />
          <button
            onClick={addManualNote}
            className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium"
          >
            Add note
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-w-6xl w-full mx-auto">
        {/* Left: Voices to Revisit */}
        <section className="bg-white/80 backdrop-blur rounded-xl border border-amber-200/60 p-4 min-h-[200px]">
          <h2 className="text-lg font-semibold text-amber-900 mb-3">
            Voices to Revisit
          </h2>
          <ul className="space-y-2">
            {nudges.length === 0 && (
              <li className="text-amber-600/80 text-sm">No nudges yet</li>
            )}
            {nudges.map((n) => {
              const p = n.payload as NudgePayload;
              return (
                <li
                  key={n.id}
                  className="p-2 rounded-lg bg-amber-50/80 border border-amber-200/40"
                >
                  <div className="font-medium text-amber-900">
                    {p.title ?? 'Nudge'}
                  </div>
                  {p.owner && (
                    <div className="text-xs text-amber-700">— {p.owner}</div>
                  )}
                  {p.suggested_phrase && (
                    <div className="text-sm text-amber-800 mt-1 italic">
                      &ldquo;{p.suggested_phrase}&rdquo;
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Right: Idea Board */}
        <section className="bg-white/80 backdrop-blur rounded-xl border border-amber-200/60 p-4 min-h-[200px]">
          <h2 className="text-lg font-semibold text-amber-900 mb-3">
            Idea Board
          </h2>
          <div className="space-y-2">
            {ideaBoard.length === 0 && (
              <p className="text-amber-600/80 text-sm">No ideas yet</p>
            )}
            {ideaBoard.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg bg-amber-50/80 border border-amber-200/40"
              >
                <span className="font-medium text-amber-900">{item.title}</span>
                <div className="flex items-center gap-2 text-xs text-amber-700">
                  {item.owner && <span>{item.owner}</span>}
                  {item.status && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100">
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Transcript Feed (host-only) */}
      {role === 'host' && (
        <section className="p-4 border-t border-amber-200/60 bg-white/60">
          <h2 className="text-lg font-semibold text-amber-900 mb-3">
            Transcript Feed
          </h2>
          <div className="max-h-32 overflow-y-auto space-y-1 text-sm text-amber-800">
            {transcriptChunks.length === 0 && (
              <p className="text-amber-600/80">No transcript chunks yet</p>
            )}
            {transcriptChunks.map((t) => (
              <div key={t.id} className="py-1">
                {(t.payload as { text?: string }).text ?? '(no text)'}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="p-4">
        <Link
          href="/"
          className="text-amber-700 hover:text-amber-900 font-medium"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
