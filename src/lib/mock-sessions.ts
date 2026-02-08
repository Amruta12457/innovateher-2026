/**
 * In-memory session store for local mock mode when Supabase is not configured.
 * Sessions persist for the lifetime of the Node process (lost on server restart).
 * Uses globalThis so the store survives HMR in dev mode.
 */

export type Session = {
  id: string;
  code: string;
  status: string;
  host_name: string | null;
  created_at: string;
};

const globalForMock = globalThis as unknown as {
  __mockSessions?: Map<string, Session>;
  __mockSessionsById?: Map<string, Session>;
};
const sessions = globalForMock.__mockSessions ?? new Map<string, Session>();
const sessionsById = globalForMock.__mockSessionsById ?? new Map<string, Session>();
if (!globalForMock.__mockSessions) globalForMock.__mockSessions = sessions;
if (!globalForMock.__mockSessionsById) globalForMock.__mockSessionsById = sessionsById;

export function createSessionMock(code: string, hostName: string): Session {
  const session: Session = {
    id: crypto.randomUUID(),
    code,
    status: 'active',
    host_name: hostName,
    created_at: new Date().toISOString(),
  };
  sessions.set(code.toUpperCase(), session);
  sessionsById.set(session.id, session);
  return session;
}

export function getSessionByCodeMock(code: string): Session | null {
  return sessions.get(code.toUpperCase()) ?? null;
}

export function updateSessionStatusMock(sessionId: string, status: string): boolean {
  const s = sessionsById.get(sessionId);
  if (!s) return false;
  s.status = status;
  return true;
}
