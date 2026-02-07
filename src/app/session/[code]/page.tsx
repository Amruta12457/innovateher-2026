import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionByCode } from '@/lib/sessions';

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ role?: string; name?: string }>;
};

export default async function SessionPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { role = 'viewer', name = 'Participant' } = await searchParams;
  const session = await getSessionByCode(code);

  if (!session) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-amber-200/60 p-8">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-amber-900">
            Session: {session.code}
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-amber-600">Status:</span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                session.status === 'active'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {session.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-amber-600">Your role:</span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                role === 'host'
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {role}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-amber-600">Display name:</span>
            <span className="text-amber-900 font-medium">{name}</span>
          </div>
        </div>

        <p className="mt-6 text-sm text-amber-700/70">
          This is a session stub. Realtime, mic, and reflection features will be
          added in future chunks.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex items-center text-amber-700 hover:text-amber-900 font-medium"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
