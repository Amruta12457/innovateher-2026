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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <header className="p-4 border-b border-amber-200/60 bg-white/80 backdrop-blur">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-amber-900">Shine Dashboard</h1>
          <Link href="/" className="text-amber-700 hover:text-amber-900 font-medium text-sm">
            New session
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {meetings.length === 0 ? (
          <p className="text-amber-700">No meetings yet. End a session to see Shine Reflection Reports here.</p>
        ) : (
          <ul className="space-y-3">
            {meetings.map((m) => {
              const ref = r(m);
              return (
                <li key={m.id}>
                  <Link
                    href={`/dashboard/${m.id}`}
                    className="block p-4 rounded-xl border border-amber-200/60 bg-white/80 hover:bg-amber-50/80 transition-colors"
                  >
                    <span className="font-medium text-amber-900">{code(ref)}</span>
                    <span className="text-amber-600 text-sm ml-2">
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                    {highlight(ref) && (
                      <p className="text-sm text-amber-700 mt-1 line-clamp-2">{highlight(ref)}</p>
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
