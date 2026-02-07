import Link from 'next/link';

export default function SessionNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-amber-200/60 p-8 text-center">
        <h1 className="text-xl font-bold text-amber-900 mb-2">
          Session not found
        </h1>
        <p className="text-amber-700/80 mb-6">
          This session may have ended or the code might be incorrect. Please
          check and try again.
        </p>
        <Link
          href="/"
          className="inline-flex items-center text-amber-700 hover:text-amber-900 font-medium"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
