/**
 * Meetings: Supabase when configured, API/mock when not.
 */

import { getSupabase } from './supabase';

export type Meeting = {
  id: string;
  session_id: string | null;
  transcript: string;
  reflection: Record<string, unknown>;
  created_at: string;
};

export async function createMeeting(
  sessionId: string | null,
  transcript: string,
  reflection: Record<string, unknown>
): Promise<Meeting> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from('meetings')
      .insert({ session_id: sessionId, transcript, reflection })
      .select()
      .single();

    if (error) throw error;
    return data as Meeting;
  }

  const res = await fetch(
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/meetings`
      : '/api/meetings',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, transcript, reflection }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to create meeting');
  }
  return res.json() as Promise<Meeting>;
}

export async function getMeetings(): Promise<Meeting[]> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from('meetings')
      .select()
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Meeting[];
  }

  if (typeof window === 'undefined') {
    const { getMeetingsMock } = await import('./mock-meetings');
    return getMeetingsMock();
  }

  const res = await fetch(`${window.location.origin}/api/meetings`);
  if (!res.ok) return [];
  return res.json() as Promise<Meeting[]>;
}

export async function getMeetingById(id: string): Promise<Meeting | null> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from('meetings')
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Meeting | null;
  }

  if (typeof window === 'undefined') {
    const { getMeetingByIdMock } = await import('./mock-meetings');
    return getMeetingByIdMock(id);
  }

  const res = await fetch(`${window.location.origin}/api/meetings/${id}`);
  if (!res.ok) return null;
  return res.json() as Promise<Meeting>;
}
