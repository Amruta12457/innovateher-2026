/**
 * Meetings: Supabase when configured, in-memory mock when not.
 * Used from API routes and server components.
 */

import { getSupabase } from './supabase';
import {
  createMeetingMock,
  getMeetingsMock,
  getMeetingByIdMock,
} from './mock-meetings';

export type MeetingRow = {
  id: string;
  session_id: string | null;
  transcript: string;
  reflection: Record<string, unknown>;
  created_at: string;
};

export async function createMeeting(
  sessionId: string,
  transcript: string,
  reflection: Record<string, unknown>
): Promise<MeetingRow> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('meetings')
      .insert({ session_id: sessionId, transcript, reflection })
      .select()
      .single();
    if (error) throw error;
    return data as MeetingRow;
  }
  return createMeetingMock(sessionId, transcript, reflection);
}

export async function getMeetings(): Promise<MeetingRow[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('meetings')
      .select()
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as MeetingRow[];
  }
  return getMeetingsMock();
}

export async function getMeetingById(id: string): Promise<MeetingRow | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('meetings')
      .select()
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as MeetingRow | null;
  }
  return getMeetingByIdMock(id);
}
