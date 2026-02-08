/**
 * In-memory meetings store for mock mode.
 */

export type Meeting = {
  id: string;
  session_id: string | null;
  transcript: string;
  reflection: Record<string, unknown>;
  created_at: string;
};

const globalForMock = globalThis as unknown as { __mockMeetings?: Meeting[] };
let meetings: Meeting[] = globalForMock.__mockMeetings ?? [];
if (!globalForMock.__mockMeetings) globalForMock.__mockMeetings = meetings;

export function createMeetingMock(
  sessionId: string | null,
  transcript: string,
  reflection: Record<string, unknown>
): Meeting {
  const meeting: Meeting = {
    id: crypto.randomUUID(),
    session_id: sessionId,
    transcript,
    reflection,
    created_at: new Date().toISOString(),
  };
  meetings = [meeting, ...meetings];
  globalForMock.__mockMeetings = meetings;
  return meeting;
}

export function getMeetingsMock(): Meeting[] {
  return [...meetings];
}

export function getMeetingByIdMock(id: string): Meeting | null {
  return meetings.find((m) => m.id === id) ?? null;
}
