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
| `STT_PROVIDER`               | `mock` (default), `deepgram`, `assemblyai`, `google` |
| `STT_API_KEY`                | API key for real STT (optional; mock used if missing) |

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

- Landing page (Create / Join session)
- Session page with live events feed: Voices to Revisit, Idea Board, Transcript Feed
- Supabase Realtime for events (when configured) or localStorage polling (mock)
- Host-only: Start/Stop Listening (mic capture), Type a note fallback, test buttons
- Session code generator (e.g. `SUNFLOWER-42`)

Not yet implemented: real STT (Deepgram/AssemblyAI/Google), Gemini, dashboard.

## Mic Permissions

When the host clicks **Start Listening**, the browser will request microphone access. If you deny or block it:

- A friendly banner appears: *"Mic access denied. Use Type a note below to add transcript manually."*
- Use the **Type a note** input box to add transcript chunks manually.

To enable mic capture, allow the site in your browser (e.g. Chrome: click the lock/mic icon in the address bar → Site settings → Microphone → Allow). Use **https** or **localhost**; some browsers restrict `getUserMedia` on insecure origins.

## Testing Realtime (Two Tabs)

1. **Create a session** as host: go to `/`, click Create Session.
2. **Copy the session link** (Copy link button) or note the session code.
3. **Open a second tab**: paste the link or join with the code as a viewer.
4. **In the host tab**: click "Add test transcript chunk" or "Add test nudge".
5. **In the viewer tab**: new events should appear within ~1 second (mock) or instantly (Supabase Realtime).

**Supabase Realtime setup**: Run `supabase/rls-policies.sql` in Supabase SQL Editor to enable events RLS and Realtime. Without it, Supabase will still store events, but the viewer tab may not see them in real time until you refresh.
