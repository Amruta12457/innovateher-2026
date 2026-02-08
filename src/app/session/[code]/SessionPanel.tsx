'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchEvents, insertEvent, type EventRow } from '@/lib/events';
import { startOverlapDetection } from '@/lib/overlap-detection';
import { buildSpeakerLabeledTranscript } from '@/lib/transcript';

type Session = {
  id: string;
  code: string;
  status: string;
};

type NudgePayload = {
  type?: string;
  title?: string;
  owner?: string;
  interrupted_idea?: string;
  extracted_ideas?: string[];
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

const CHUNK_MS = 10_000;
const NUDGE_INTERVAL_MS =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_NUDGE_INTERVAL_SECONDS
    ? parseInt(process.env.NEXT_PUBLIC_NUDGE_INTERVAL_SECONDS, 10) * 1000
    : 3 * 60 * 1000) || 3 * 60 * 1000;

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
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [endMeetingLoading, setEndMeetingLoading] = useState(false);
  const [interruptionDetectionEnabled, setInterruptionDetectionEnabled] = useState(true);
  const router = useRouter();

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const listeningRef = useRef(false);
  const overlapDetectorRef = useRef<{ stop: () => void } | null>(null);
  const transcriptRef = useRef('');
  const transcriptChunksRef = useRef<EventRow[]>([]);
  const nudgeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [participantIdentity, setParticipantIdentity] = useState<{
    participantId: string;
    displayName: string;
  } | null>(null);

  useEffect(() => {
    const STORAGE_KEY = 'shine-panel-participant-id';
    let id = sessionStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(STORAGE_KEY, id);
    }
    setParticipantIdentity({ participantId: id, displayName: name || 'Participant' });
  }, [name]);

  const participantId = participantIdentity?.participantId ?? '';
  const participantDisplayName = participantIdentity?.displayName ?? (name || 'Participant');

  const transcriptChunks = dedupeById(
    events.filter((e) => e.type === 'transcript_chunk')
  );
  const nudges = dedupeById(events.filter((e) => e.type === 'nudge'));
  const interruptions = dedupeById(events.filter((e) => e.type === 'interruption'));
  const speakerLabeledTranscript = buildSpeakerLabeledTranscript(transcriptChunks);
  const fullTranscript = transcriptChunks
    .map((t) => (t.payload as { text?: string }).text ?? '')
    .join(' ');
  transcriptRef.current = speakerLabeledTranscript || fullTranscript;
  transcriptChunksRef.current = transcriptChunks;

  const ideaBoard = nudges.flatMap((e) => {
    const p = e.payload as NudgePayload;
    const ideas = p.extracted_ideas ?? (p.interrupted_idea ? [p.interrupted_idea] : [p.title ?? 'Untitled']);
    return ideas.map((idea, i) => ({
      id: `${e.id}-${i}`,
      title: idea,
      owner: p.owner ?? '',
      status: p.confidence != null ? `${Math.round((p.confidence ?? 0) * 100)}%` : '',
    }));
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
        if (participantId) form.append('participantId', participantId);
        if (participantDisplayName) form.append('displayName', participantDisplayName);
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
          user_id: participantId || data?.participantId,
          display_name: participantDisplayName || data?.displayName,
        };
        if (data?.stt_status) payload.stt_status = data.stt_status;
        await insertEvent(session.id, 'transcript_chunk', payload);
      } catch (e) {
        setTranscribeWarning('Transcript failed. Try typing a note.');
      }
    },
    [session.id, participantId, participantDisplayName]
  );

  const startListening = useCallback(async () => {
    try {
      setMicDenied(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      listeningRef.current = true;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const startNextSegment = () => {
        if (!listeningRef.current || !streamRef.current) return;
        const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
        recorderRef.current = recorder;

        recorder.ondataavailable = async (e) => {
          if (e.data.size > 0) {
            await transcribeChunk(e.data);
          }
        };

        recorder.onstop = () => {
          recorderRef.current = null;
          if (listeningRef.current && streamRef.current) {
            setTimeout(startNextSegment, 0);
          } else {
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
        };

        recorder.start();
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, CHUNK_MS);
      };

      startNextSegment();
      setListening(true);

      if (interruptionDetectionEnabled) {
        overlapDetectorRef.current?.stop();
        overlapDetectorRef.current = startOverlapDetection(stream, {
          onInterruption: async (confidence) => {
            try {
              const recent = transcriptRef.current.trim();
              const sentences = recent.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
              const lastTopic = sentences.length > 0
                ? sentences[sentences.length - 1]
                : recent.slice(-150).replace(/\s+/g, ' ').trim() || undefined;
              await insertEvent(session.id, 'interruption', {
                timestamp: new Date().toISOString(),
                confidence,
                interrupted_idea: lastTopic,
              });
            } catch (err) {
              console.warn('[overlap] Failed to insert interruption event:', err);
            }
          },
          onError: () => {
            setInterruptionDetectionEnabled(false);
          },
        });
      }
    } catch (e) {
      setMicDenied(true);
      setListening(false);
    }
  }, [transcribeChunk, session.id, interruptionDetectionEnabled]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    overlapDetectorRef.current?.stop();
    overlapDetectorRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    } else if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
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
        user_id: participantId,
        display_name: participantDisplayName,
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
        user_id: participantId,
        display_name: participantDisplayName,
      });
    } catch (e) {
      console.error('Failed to add transcript chunk:', e);
    }
  };

  const addTestNudge = async () => {
    try {
      await insertEvent(session.id, 'nudge', {
        type: 'idea_revisit',
        title: 'Possible Interruption',
        interrupted_idea: 'Their point about the project timeline',
        rationale: 'Abrupt topic change',
        suggested_phrase: "Let's revisit that thought",
        confidence: 0.9,
      });
    } catch (e) {
      console.error('Failed to add nudge:', e);
    }
  };

  const generateNudgeFromLast10Min = useCallback(async () => {
    if (nudgeLoading) return;
    const chunks = transcriptChunksRef.current;
    const tenMinAgo = Date.now() - NUDGE_INTERVAL_MS;
    const recentChunks = chunks.filter(
      (t) => new Date(t.created_at).getTime() >= tenMinAgo
    );
    const speakerChunks = buildSpeakerLabeledTranscript(recentChunks).split('\n').filter(Boolean);
    if (speakerChunks.length === 0) return;
    setNudgeLoading(true);
    try {
      const transcript = buildSpeakerLabeledTranscript(recentChunks);
      const res = await fetch('/api/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          transcriptSoFar: transcript,
          transcriptChunks: speakerChunks,
          windowMinutes: 10,
        }),
      });
      const data = await res.json();
      const nudgesList = data?.nudges ?? [];
      if (nudgesList.length === 0) return;
      for (const n of nudgesList) {
        const payload = {
          type: n.type ?? 'idea_revisit',
          title: n.title,
          owner: n.owner,
          interrupted_idea: n.interrupted_idea,
          extracted_ideas: n.extracted_ideas,
          rationale: n.rationale,
          suggested_phrase: n.suggested_phrase,
          confidence: n.confidence,
        };
        const inserted = await insertEvent(session.id, 'nudge', payload);
        setEvents((prev) => {
          if (prev.some((e) => e.id === inserted.id)) return prev;
          const next = [...prev, inserted].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );
          return next.slice(-50);
        });
      }
    } catch (e) {
      console.error('Failed to generate nudge:', e);
    } finally {
      setNudgeLoading(false);
    }
  }, [session.id, nudgeLoading]);

  const generateNudge = useCallback(async () => {
    if (nudgeLoading) return;
    const speakerChunks = buildSpeakerLabeledTranscript(transcriptChunks).split('\n').filter(Boolean);
    if (speakerChunks.length === 0) return;
    setNudgeLoading(true);
    try {
      const transcript = buildSpeakerLabeledTranscript(transcriptChunks);
      const res = await fetch('/api/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          transcriptSoFar: transcript,
          transcriptChunks: speakerChunks,
          windowMinutes: 10,
        }),
      });
      const data = await res.json();
      const nudgesList = data?.nudges ?? [];
      if (nudgesList.length === 0) return;
      for (const n of nudgesList) {
        const payload = {
          type: n.type ?? 'idea_revisit',
          title: n.title,
          owner: n.owner,
          interrupted_idea: n.interrupted_idea,
          extracted_ideas: n.extracted_ideas,
          rationale: n.rationale,
          suggested_phrase: n.suggested_phrase,
          confidence: n.confidence,
        };
        const inserted = await insertEvent(session.id, 'nudge', payload);
        setEvents((prev) => {
          if (prev.some((e) => e.id === inserted.id)) return prev;
          const next = [...prev, inserted].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );
          return next.slice(-50);
        });
      }
    } catch (e) {
      console.error('Failed to generate nudge:', e);
    } finally {
      setNudgeLoading(false);
    }
  }, [session.id, nudgeLoading, transcriptChunks]);

  const endMeeting = useCallback(async () => {
    if (endMeetingLoading) return;
    setEndMeetingLoading(true);
    try {
      await fetch('/api/sessions/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, status: 'ended' }),
      });
      const transcript = buildSpeakerLabeledTranscript(transcriptChunks);
      const interruptionPayloads = interruptions.map((e) => e.payload);
      const reflectRes = await fetch('/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          transcript,
          interruptionEvents: interruptionPayloads,
        }),
      });
      const reflection = await reflectRes.json();
      (reflection as Record<string, unknown>)._sessionCode = session.code;
      await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          transcript,
          reflection,
        }),
      });
      router.push('/dashboard');
    } catch (e) {
      console.error('Failed to end meeting:', e);
      setEndMeetingLoading(false);
    }
  }, [session.id, session.code, endMeetingLoading, interruptions, transcriptChunks]);

  useEffect(() => {
    if (!listening || role !== 'host') return;
    const first = setTimeout(() => {
      void generateNudgeFromLast10Min();
      const interval = setInterval(generateNudgeFromLast10Min, NUDGE_INTERVAL_MS);
      nudgeIntervalRef.current = interval;
    }, NUDGE_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);
      nudgeIntervalRef.current = null;
    };
  }, [listening, role, generateNudgeFromLast10Min]);

  const clearLocalView = () => {
    setEvents([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/90 via-violet-50/70 to-fuchsia-50/80 flex items-center justify-center">
        <p className="text-indigo-700">Loading session…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/90 via-violet-50/70 to-fuchsia-50/80 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white/90 backdrop-blur-xl border-b border-indigo-100/80 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-indigo-900">{session.code}</h1>
          <button
            onClick={copyLink}
            className="px-3 py-1.5 rounded-xl bg-indigo-100 hover:bg-indigo-200/80 text-indigo-800 text-sm font-medium transition-colors"
          >
            Copy link
          </button>
          {(role === 'host' || listening) && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                listening
                  ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                  : 'bg-indigo-100/80 text-indigo-600'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  listening ? 'bg-emerald-500' : 'bg-indigo-400'
                }`}
              />
              {listening ? (role === 'host' ? 'Listening' : 'Contributing') : 'Not listening'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              role === 'host'
                ? 'bg-indigo-200/90 text-indigo-900'
                : 'bg-indigo-100/80 text-indigo-700'
            }`}
          >
            {role}
          </span>
          <span className="text-sm text-indigo-700">{name}</span>
        </div>
      </header>

      {/* Mic denied banner */}
      {micDenied && (
        <div className="px-4 py-2 bg-violet-100/80 border-b border-indigo-100 text-indigo-900 text-sm">
          Mic access denied. Use &ldquo;Type a note&rdquo; below to add transcript manually.
        </div>
      )}

      {/* Transcribe warning */}
      {transcribeWarning && (
        <div className="px-4 py-2 bg-indigo-50/80 border-b border-indigo-100 text-indigo-800 text-sm">
          {transcribeWarning}
        </div>
      )}

      {/* Mic controls - all participants */}
      <div className="p-4 flex flex-wrap gap-2 border-b border-indigo-100/60 bg-white/40 backdrop-blur-sm">
        {!listening ? (
          <button
            onClick={startListening}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-lg shadow-emerald-200/50 transition-colors"
          >
            {role === 'host' ? 'Start Listening' : 'Enable mic to contribute'}
          </button>
        ) : (
          <button
            onClick={stopListening}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-lg shadow-rose-200/50 transition-colors"
          >
            {role === 'host' ? 'Stop Listening' : 'Stop contributing'}
          </button>
        )}
        {role === 'host' && (
          <>
          <button
            onClick={addTestTranscript}
            className="px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors shadow-md shadow-indigo-200/40"
          >
            Add test transcript chunk
          </button>
          <button
            onClick={addTestNudge}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-md shadow-indigo-200/40"
          >
            Add test nudge
          </button>
          <button
            onClick={generateNudge}
            disabled={nudgeLoading || transcriptChunks.length === 0}
            className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium transition-colors shadow-md shadow-violet-200/40"
            title={transcriptChunks.length === 0 ? 'Add a note first' : 'Analyze latest transcript for interrupted ideas'}
          >
            {nudgeLoading ? 'Generating…' : 'Generate nudge now'}
          </button>
          <button
            onClick={endMeeting}
            disabled={endMeetingLoading}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-medium transition-colors shadow-md shadow-rose-200/40"
          >
            {endMeetingLoading ? 'Ending…' : 'End Meeting'}
          </button>
          <button
            onClick={clearLocalView}
            className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium transition-colors"
          >
            Clear local view
          </button>
          </>
        )}
      </div>

      {/* Type a note - all participants */}
      <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-indigo-100/60 bg-white/50 backdrop-blur-sm">
          <input
            type="text"
            placeholder="Type a note..."
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addManualNote()}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-indigo-200/80 bg-white text-indigo-900 placeholder-indigo-400 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all"
          />
          <button
            onClick={addManualNote}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-md shadow-indigo-200/40"
          >
            Add note
          </button>
        </div>

      {/* Main content */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-w-6xl w-full mx-auto">
        {/* Left: Voices to Revisit */}
        <section className="bg-white/90 backdrop-blur-xl rounded-2xl border border-indigo-100/80 p-5 min-h-[200px] shadow-lg shadow-indigo-100/30">
          <h2 className="text-lg font-semibold text-indigo-900 mb-3">
            Voices to Revisit
          </h2>
          <ul className="space-y-2">
            {nudges.length === 0 && (
              <li className="text-indigo-600/80 text-sm">No nudges yet</li>
            )}
            {nudges
              .sort(
                (a, b) =>
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
              .map((e) => {
                const topic =
                  (e.payload as NudgePayload).interrupted_idea ??
                  (e.payload as NudgePayload).rationale;
                return (
                  <li
                    key={e.id}
                    className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-100/80 transition-colors"
                  >
                    <div className="font-medium text-indigo-900">
                      Possible Interruption
                    </div>
                    {topic && (
                      <div className="text-sm text-indigo-800 mt-1">
                        <span className="font-medium">Topic that was interrupted: </span>
                        {topic}
                      </div>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>

        {/* Right: Idea Board */}
        <section className="bg-white/90 backdrop-blur-xl rounded-2xl border border-indigo-100/80 p-5 min-h-[200px] shadow-lg shadow-indigo-100/30">
          <h2 className="text-lg font-semibold text-indigo-900 mb-3">
            Idea Board
          </h2>
          <div className="space-y-2">
            {ideaBoard.length === 0 && (
              <p className="text-indigo-600/80 text-sm">No ideas yet</p>
            )}
            {ideaBoard.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/80 border border-indigo-100/80 transition-colors"
              >
                <span className="font-medium text-indigo-900">{item.title}</span>
                <div className="flex items-center gap-2 text-xs text-indigo-700">
                  {item.owner && <span>{item.owner}</span>}
                  {item.status && (
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800">
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Transcript Feed - all participants */}
      <section className="p-4 border-t border-indigo-100/80 bg-white/60 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-indigo-900 mb-3">
          Transcript Feed
        </h2>
        <div className="max-h-32 overflow-y-auto space-y-1 text-sm text-indigo-800">
          {transcriptChunks.length === 0 && (
            <p className="text-indigo-600/80">No transcript chunks yet</p>
          )}
          {transcriptChunks.map((t) => {
            const p = t.payload as { text?: string; display_name?: string };
            const label = p.display_name || 'Speaker';
            const text = p.text ?? '(no text)';
            return (
              <div key={t.id} className="py-1">
                <span className="font-medium text-indigo-900">{label}:</span>{' '}
                {text}
              </div>
            );
          })}
        </div>
      </section>

      <div className="p-4">
        <Link
          href="/"
          className="text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
