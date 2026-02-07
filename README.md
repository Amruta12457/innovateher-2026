# Shine Panel

A shared-session meeting companion for the InnovateHer 2026 hackathon. One person is the Host/Listener who captures audio and generates live nudges; others join as Viewers to see the same idea board. After the meeting, a Shine Reflection Report highlights participation and recognition.

## Tech Stack

- **Next.js** App Router + TypeScript
- **Tailwind CSS**
- **Supabase** (optional—app runs without it)

## Setup

1. Clone and install dependencies:

   ```bash
   npm install
   ```

2. Run the dev server:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

### Environment Variables (Optional)

The app works without these. If missing, it runs in **local mock mode** (in-memory sessions).

| Variable                     | Description            |
| ---------------------------- | ---------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`   | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key  |

Create `.env.local` in the project root (same folder as `package.json`):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- Use separate lines (no commas). No quotes unless a value has spaces.
- Restart the dev server after changing `.env.local`.

## Database Schema

1. In Supabase dashboard: **SQL Editor** → **New query**
2. Paste the contents of `supabase/schema.sql` and run it (creates tables + RLS policies).

If you already ran the schema before RLS was added, run `supabase/rls-policies.sql` instead.

The schema defines:

- **sessions** – meeting sessions (code, status, host_name)
- **events** – realtime events within a session
- **meetings** – transcript + reflection report after a meeting

See `supabase/schema.sql` for the full DDL.

## Current Scope

This chunk includes:

- Landing page (Create / Join session)
- Session page stub with code, status, role, and display name
- Session code generator (e.g. `SUNFLOWER-42`)
- Supabase client helper (no-ops when env vars missing)
- Local mock mode using in-memory storage

Not yet implemented: realtime, mic, Gemini, dashboard.
