/**
 * In-memory meetings store when Supabase is not configured.
 * Data is lost on server restart.
 */

export type MeetingRow = {
  id: string;
  session_id: string | null;
  transcript: string;
  reflection: Record<string, unknown>;
  created_at: string;
};

const store = new Map<string, MeetingRow>();

export function createMeetingMock(
  sessionId: string,
  transcript: string,
  reflection: Record<string, unknown>
): MeetingRow {
  const id = crypto.randomUUID();
  const row: MeetingRow = {
    id,
    session_id: sessionId,
    transcript,
    reflection,
    created_at: new Date().toISOString(),
  };
  store.set(id, row);
  return row;
}

export function getMeetingsMock(): MeetingRow[] {
  return Array.from(store.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getMeetingByIdMock(id: string): MeetingRow | null {
  return store.get(id) ?? null;
}
