/**
 * Events: Supabase when configured, localStorage when not.
 * All functions run client-side (localStorage is browser-only).
 */

import { getSupabase } from './supabase';

export type EventRow = {
  id: string;
  session_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

const EVENTS_KEY_PREFIX = 'shine-panel-events-';
const LIMIT = 50;

function getStorageKey(sessionId: string) {
  return `${EVENTS_KEY_PREFIX}${sessionId}`;
}

export async function fetchEvents(sessionId: string): Promise<EventRow[]> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from('events')
      .select()
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(LIMIT);

    if (error) throw error;
    return (data ?? []) as EventRow[];
  }

  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(getStorageKey(sessionId));
  const list: EventRow[] = raw ? JSON.parse(raw) : [];
  return list.slice(-LIMIT);
}

export async function insertEvent(
  sessionId: string,
  type: string,
  payload: Record<string, unknown>
): Promise<EventRow> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from('events')
      .insert({ session_id: sessionId, type, payload })
      .select()
      .single();

    if (error) throw error;
    return data as EventRow;
  }

  if (typeof window === 'undefined') {
    throw new Error('Cannot insert event on server');
  }

  const event: EventRow = {
    id: crypto.randomUUID(),
    session_id: sessionId,
    type,
    payload,
    created_at: new Date().toISOString(),
  };

  const key = getStorageKey(sessionId);
  const raw = localStorage.getItem(key);
  const list: EventRow[] = raw ? JSON.parse(raw) : [];
  list.push(event);
  localStorage.setItem(key, JSON.stringify(list));
  return event;
}

export function subscribeToEvents(
  sessionId: string,
  onEvents: (events: EventRow[]) => void
): () => void {
  const supabase = getSupabase();

  if (supabase) {
    const channel = supabase
      .channel(`events:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `session_id=eq.${sessionId}`,
        },
        async () => {
          const events = await fetchEvents(sessionId);
          onEvents(events);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Mock: poll localStorage every 1s
  const poll = async () => {
    const events = await fetchEvents(sessionId);
    onEvents(events);
  };

  poll(); // initial
  const interval = setInterval(poll, 1000);

  return () => clearInterval(interval);
}
