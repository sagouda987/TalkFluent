'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function AuthActions() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <Button variant="secondary">Loading...</Button>;
  }

  if (!session?.user) {
    return <Button onClick={() => signIn('google', { callbackUrl: '/' })}>Sign in with Google</Button>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-slate-600 sm:inline">{session.user.name ?? session.user.email}</span>
      <Button variant="secondary" onClick={() => signOut({ callbackUrl: '/' })}>
        Sign out
      </Button>
    </div>
  );
}
