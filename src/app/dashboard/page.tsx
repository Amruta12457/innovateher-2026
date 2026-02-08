import Link from 'next/link';
import { getMeetings } from '@/lib/meetings';

export default async function DashboardPage() {
  const meetings = await getMeetings();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <header className="p-4 border-b border-amber-200/60 bg-white/80 backdrop-blur">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-amber-900">Shine Panel Dashboard</h1>
          <Link
            href="/"
            className="text-amber-700 hover:text-amber-900 font-medium text-sm"
          >
            ← New session
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <h2 className="text-lg font-semibold text-amber-900 mb-4">Past meetings</h2>
        {meetings.length === 0 ? (
          <p className="text-amber-600/80">No meetings yet. End a session to see Shine Reflection Reports here.</p>
        ) : (
          <ul className="space-y-3">
            {meetings.map((m) => {
              const code = (m.reflection as { _sessionCode?: string })?._sessionCode ?? '—';
              const voices = (m.reflection as { voices_to_revisit?: Array<{ idea?: string }> })?.voices_to_revisit ?? [];
              const highlight = voices[0]?.idea ?? 'No highlights';
              const date = new Date(m.created_at).toLocaleDateString();
              return (
                <li key={m.id}>
                  <Link
                    href={`/dashboard/${m.id}`}
                    className="block p-4 rounded-xl bg-white/80 border border-amber-200/60 hover:border-amber-300/80 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-amber-900">{code}</span>
                        <span className="text-amber-600/80 text-sm ml-2">({date})</span>
                      </div>
                      <span className="text-amber-600 text-sm">View report →</span>
                    </div>
                    <p className="mt-2 text-sm text-amber-800 line-clamp-2">{highlight}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
