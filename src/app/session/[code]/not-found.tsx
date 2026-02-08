import Link from 'next/link';

export default function SessionNotFound() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface-elevated backdrop-blur rounded-2xl shadow-lg border border-border p-8 text-center">
        <h1 className="text-xl font-bold text-heading mb-2">
          Session not found
        </h1>
        <p className="text-muted mb-6">
          This session may have ended or the code might be incorrect. Please
          check and try again.
        </p>
        <Link
          href="/"
          className="inline-flex items-center text-muted hover:text-heading font-medium"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
