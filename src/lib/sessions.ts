/**
 * Session storage: Supabase when configured, in-memory mock when not.
 */

export type Session = {
  id: string;
  code: string;
  status: string;
  host_name: string | null;
  created_at: string;
};

export async function createSession(code: string, hostName: string): Promise<Session> {
  const { getSupabase } = await import('./supabase');
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from('sessions')
      .insert({ code, host_name: hostName, status: 'active' })
      .select()
      .single();

    if (error) throw error;
    return data as Session;
  }

  const res = await fetch(
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/sessions`
      : '/api/sessions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, host_name: hostName }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to create session');
  }
  return res.json() as Promise<Session>;
}

export async function getSessionByCode(code: string): Promise<Session | null> {
  const { getSupabase } = await import('./supabase');
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from('sessions')
      .select()
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (error) throw error;
    return data as Session | null;
  }

  const { getSessionByCodeMock } = await import('./mock-sessions');
  return getSessionByCodeMock(code);
}

export async function updateSessionStatus(sessionId: string, status: string): Promise<boolean> {
  const { getSupabase } = await import('./supabase');
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase
      .from('sessions')
      .update({ status })
      .eq('id', sessionId);
    if (error) {
      console.error('[sessions] update status error:', error);
      return false;
    }
    return true;
  }

  const { updateSessionStatusMock } = await import('./mock-sessions');
  return updateSessionStatusMock(sessionId, status);
}
