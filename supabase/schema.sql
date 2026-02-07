-- Shine Panel - Supabase Schema
-- Run this in Supabase SQL Editor when ready to apply

-- Sessions: one per meeting session (host creates, viewers join)
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  host_name text,
  created_at timestamptz DEFAULT now()
);

-- Events: realtime events within a session (nudges, etc.)
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Meetings: transcript + reflection report after meeting ends
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  transcript text NOT NULL DEFAULT '',
  reflection jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(code);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_meetings_session_id ON meetings(session_id);

-- RLS policies: allow anon (public) access for create/join flow
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert sessions" ON sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select sessions" ON sessions FOR SELECT TO anon USING (true);

-- RLS for events (realtime feed)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert events" ON events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select events" ON events FOR SELECT TO anon USING (true);

-- Enable Realtime for events table
ALTER PUBLICATION supabase_realtime ADD TABLE events;
