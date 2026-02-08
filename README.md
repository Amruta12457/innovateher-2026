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
| `STT_PROVIDER`               | `mock` (default), `deepgram` (others can be added later) |
| `STT_API_KEY`                | Deepgram API key (optional; mock used if missing) |
| `GEMINI_API_KEY`             | Optional. For AI nudges and Shine Reflection Report. Uses mock if missing. **Never expose to client.** |
| `NEXT_PUBLIC_NUDGE_INTERVAL_SECONDS` | Optional. Seconds between auto-nudges (default: 60). |

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
- **Overlap-based interruption detection** (Web Audio API, client-side) — detects possible interruptions via audio energy
- AI nudges (`POST /api/nudge`) and Shine Reflection Report (`POST /api/reflect`) via Gemini (mock when `GEMINI_API_KEY` not set)
- Meetings storage and dashboard: list meetings and view full Shine Reflection Report (including Interruption Patterns)

## STT (Speech-to-Text) Setup

### Using Mock (Default)

No configuration needed. Transcription returns placeholder text for testing the pipeline.

### Using Deepgram

1. Get a [Deepgram API key](https://console.deepgram.com/signup) (free tier available).
2. Add to `.env.local`:
   ```
   STT_PROVIDER=deepgram
   STT_API_KEY=your-deepgram-api-key
   ```
3. Restart the dev server.

**Audio format**: Chrome’s MediaRecorder produces `audio/webm` (Opus), which Deepgram supports. **Chrome recommended; webm supported.** For other browsers, see [Deepgram supported formats](https://developers.deepgram.com/docs/supported-audio-formats).

### Verifying Transcription Works

1. Create a session as host.
2. Click **Start Listening** and allow mic access.
3. Speak clearly for a few seconds.
4. Wait ~10 seconds for the first chunk; real speech should appear in the Transcript Feed.
5. If you see mock placeholder text instead, check:
   - `STT_PROVIDER=deepgram` and `STT_API_KEY` are set in `.env.local`
   - Server logs for `[transcribe] Deepgram error:` messages

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

## Overlap-Based Interruption Detection

The host browser uses the Web Audio API (AudioContext, AnalyserNode) to detect possible interruptions based on audio energy overlap:

- **RMS threshold**: Default 0.03 (tune in `src/lib/overlap-detection.ts` — lower = more sensitive, higher = fewer false positives)
- **Chrome recommended** for best compatibility with both MediaRecorder and AudioContext
- If AudioContext fails or is unsupported, interruption detection is disabled gracefully; the session continues

### Testing the Overlap Demo

1. Create a session as host and click **Start Listening**.
2. Speak into the mic; have a second person (or another tab playing audio) speak over you.
3. When overlap is detected, a "Possible interruption detected" card appears with suggested phrases ("Sorry, go ahead", "I think someone was finishing a thought").
4. Use **Dismiss** or **Snooze** to hide the card.

### End-to-End Flow (Shine Reflection)

1. Create a session as host; click **Start Listening** and speak (or use "Type a note").
2. Wait for the nudge timer (~60s) or click **Generate nudge now** to add Voices to Revisit.
3. Click **End Meeting** to generate a Shine Reflection Report (including interruption patterns) and navigate to the dashboard.
4. On **Dashboard** (`/dashboard`), click a meeting to view the full report.
