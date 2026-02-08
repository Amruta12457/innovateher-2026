-- Run this in Supabase SQL Editor if you already applied schema.sql
-- and need to add RLS policies (sessions + events) and Realtime

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon insert sessions" ON sessions;
DROP POLICY IF EXISTS "Allow anon select sessions" ON sessions;
CREATE POLICY "Allow anon insert sessions" ON sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select sessions" ON sessions FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon update sessions" ON sessions;
CREATE POLICY "Allow anon update sessions" ON sessions FOR UPDATE TO anon USING (true);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon insert events" ON events;
DROP POLICY IF EXISTS "Allow anon select events" ON events;
CREATE POLICY "Allow anon insert events" ON events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select events" ON events FOR SELECT TO anon USING (true);

-- Enable Realtime for events (ignore error if table already in publication)
ALTER PUBLICATION supabase_realtime ADD TABLE events;

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon insert meetings" ON meetings;
DROP POLICY IF EXISTS "Allow anon select meetings" ON meetings;
CREATE POLICY "Allow anon insert meetings" ON meetings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select meetings" ON meetings FOR SELECT TO anon USING (true);
