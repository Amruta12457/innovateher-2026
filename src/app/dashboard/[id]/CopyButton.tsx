'use client';

import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="px-2 py-0.5 rounded text-xs bg-amber-200 hover:bg-amber-300 text-amber-900"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
