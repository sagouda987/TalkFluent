'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function SignInPage() {
  return (
    <main className="section-shell flex min-h-screen items-center justify-center py-16">
      <section className="surface w-full max-w-md p-8">
        <h1 className="font-[var(--font-space-grotesk)] text-2xl font-bold text-slate-900">Welcome to TalkFluent</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in with Google to join voice rooms and practice spoken English in real time.</p>
        <Button className="mt-6 w-full" onClick={() => signIn('google', { callbackUrl: '/' })}>
          Continue with Google
        </Button>
      </section>
    </main>
  );
}
