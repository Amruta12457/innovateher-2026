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
      className="px-2 py-0.5 rounded-lg text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-800 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
