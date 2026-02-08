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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/90 via-violet-50/70 to-fuchsia-50/80 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-indigo-900 tracking-tight">
          Shine Panel
        </h1>
        <p className="mt-2 text-indigo-700/80">
          Shared-session meeting companion · InnovateHer 2026
        </p>
        <Link
          href="/dashboard"
          className="mt-3 inline-block text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          → View Dashboard
        </Link>
      </div>

      <div className="w-full max-w-md space-y-8">
        {/* Create Session */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-indigo-100/50 border border-indigo-100/80 p-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-4">
            Create Session
          </h2>
          <input
            type="text"
            placeholder="Your name (optional)"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-indigo-200/80 bg-white/90 text-indigo-900 placeholder-indigo-300 mb-4 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all"
          />
          <button
            onClick={handleCreateSession}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-200/50"
          >
            {loading ? 'Creating…' : 'Create Session'}
          </button>
        </div>

        {/* Join Session */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-indigo-100/50 border border-indigo-100/80 p-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-4">
            Join Session
          </h2>
          <form onSubmit={handleJoinSession} className="space-y-4">
            <input
              type="text"
              placeholder="Session code (e.g. SUNFLOWER-42)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 rounded-xl border border-indigo-200/80 bg-white/90 text-indigo-900 placeholder-indigo-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none uppercase transition-all"
            />
            <input
              type="text"
              placeholder="Your display name (optional)"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-indigo-200/80 bg-white/90 text-indigo-900 placeholder-indigo-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all"
            />
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors shadow-lg shadow-indigo-200/50"
            >
              Join Session
            </button>
          </form>
        </div>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50/90 px-4 py-2.5 rounded-xl text-center border border-rose-200/60">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
