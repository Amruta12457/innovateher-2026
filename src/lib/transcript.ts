/**
 * Transcript helpers for speaker-labeled merge and formatting.
 */

import type { EventRow } from './events';

type TranscriptChunkPayload = {
  text?: string;
  user_id?: string;
  display_name?: string;
};

/**
 * Build a speaker-labeled transcript from transcript_chunk events.
 * Sorts by created_at, formats as "SpeakerName: text".
 */
export function buildSpeakerLabeledTranscript(
  chunks: EventRow[],
  fallbackLabel = 'Speaker'
): string {
  const sorted = [...chunks].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  return sorted
    .map((e) => {
      const p = e.payload as TranscriptChunkPayload;
      const text = p.text?.trim() ?? '';
      if (!text) return '';
      const label = p.display_name || p.user_id || fallbackLabel;
      return `${label}: ${text}`;
    })
    .filter(Boolean)
    .join('\n');
}
