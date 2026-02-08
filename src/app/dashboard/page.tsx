import Link from 'next/link';
import { getMeetings } from '@/lib/meetings';

export default async function DashboardPage() {
  const meetings = await getMeetings();
  const r = (m: { reflection?: Record<string, unknown> }) => m.reflection ?? {};
  const code = (r: Record<string, unknown>) => (r._sessionCode as string) ?? '—';
  const highlight = (r: Record<string, unknown>) => {
    const v = r.voices_to_revisit as Array<{ idea?: string }> | undefined;
    return (Array.isArray(v) && v[0]?.idea) ? v[0].idea : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/90 via-violet-50/70 to-fuchsia-50/80">
      <header className="p-4 border-b border-indigo-100/80 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-900">Shine Dashboard</h1>
          <Link href="/" className="text-indigo-600 hover:text-indigo-900 font-medium text-sm transition-colors">
            New session
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {meetings.length === 0 ? (
          <p className="text-indigo-700">No meetings yet. End a session to see Shine Reflection Reports here.</p>
        ) : (
          <ul className="space-y-3">
            {meetings.map((m) => {
              const ref = r(m);
              return (
                <li key={m.id}>
                  <Link
                    href={`/dashboard/${m.id}`}
                    className="block p-5 rounded-2xl border border-indigo-100/80 bg-white/90 hover:bg-white shadow-lg shadow-indigo-100/30 hover:shadow-xl hover:shadow-indigo-100/40 transition-all"
                  >
                    <span className="font-medium text-indigo-900">{code(ref)}</span>
                    <span className="text-indigo-600 text-sm ml-2">
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                    {highlight(ref) && (
                      <p className="text-sm text-indigo-700 mt-1 line-clamp-2">{highlight(ref)}</p>
                    )}
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
