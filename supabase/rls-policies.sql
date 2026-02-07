-- Run this in Supabase SQL Editor if you already applied schema.sql
-- and need to add RLS policies for sessions (allow create/join)

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon insert sessions" ON sessions;
DROP POLICY IF EXISTS "Allow anon select sessions" ON sessions;
CREATE POLICY "Allow anon insert sessions" ON sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select sessions" ON sessions FOR SELECT TO anon USING (true);
