'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { generateSessionCode } from '@/lib/session-code';
import { createSession } from '@/lib/sessions';

export default function LandingPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [createName, setCreateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreateSession() {
    setError('');
    setLoading(true);
    try {
      const code = generateSessionCode();
      const hostName = createName.trim() || 'Host';
      await createSession(code, hostName);
      router.push(`/session/${code}?role=host&name=${encodeURIComponent(hostName)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  }

  function handleJoinSession(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const code = joinCode.trim().toUpperCase();
    const name = joinName.trim() || 'Viewer';
    if (!code) {
      setError('Please enter a session code');
      return;
    }
    router.push(`/session/${code}?role=viewer&name=${encodeURIComponent(name)}`);
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-heading tracking-tight">
          Shine Panel
        </h1>
        <p className="mt-2 text-muted">
          Shared-session meeting companion · InnovateHer 2026
        </p>
        <Link
          href="/dashboard"
          className="mt-3 inline-block text-sm text-muted hover:text-heading transition-colors font-medium"
        >
          → View Dashboard
        </Link>
      </div>

      <div className="w-full max-w-md space-y-8">
        {/* Create Session */}
        <div className="bg-surface-elevated backdrop-blur rounded-2xl shadow-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-heading mb-4">
            Create Session
          </h2>
          <input
            type="text"
            placeholder="Your name (optional)"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-border bg-surface-elevated text-heading placeholder-muted-light mb-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
          />
          <button
            onClick={handleCreateSession}
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating…' : 'Create Session'}
          </button>
        </div>

        {/* Join Session */}
        <div className="bg-surface-elevated backdrop-blur rounded-2xl shadow-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-heading mb-4">
            Join Session
          </h2>
          <form onSubmit={handleJoinSession} className="space-y-4">
            <input
              type="text"
              placeholder="Session code (e.g. SUNFLOWER-42)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 rounded-lg border border-border bg-surface-elevated text-heading placeholder-muted-light focus:ring-2 focus:ring-primary focus:border-primary outline-none uppercase transition-colors"
            />
            <input
              type="text"
              placeholder="Your display name (optional)"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-surface-elevated text-heading placeholder-muted-light focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
            />
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium transition-colors"
            >
              Join Session
            </button>
          </form>
        </div>

        {error && (
          <p className="text-sm text-accent-destructive bg-red-50 px-4 py-2 rounded-lg text-center">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
