import Link from 'next/link';

export default function SessionNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/90 via-violet-50/70 to-fuchsia-50/80 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-indigo-100/50 border border-indigo-100/80 p-8 text-center">
        <h1 className="text-xl font-bold text-indigo-900 mb-2">
          Session not found
        </h1>
        <p className="text-indigo-700/80 mb-6">
          This session may have ended or the code might be incorrect. Please
          check and try again.
        </p>
        <Link
          href="/"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-900 font-medium transition-colors"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
