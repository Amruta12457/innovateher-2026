import { notFound } from 'next/navigation';
import { getSessionByCode } from '@/lib/sessions';
import SessionPanel from './SessionPanel';

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
    <SessionPanel
      session={session}
      role={role}
      name={decodeURIComponent(name)}
    />
  );
}
