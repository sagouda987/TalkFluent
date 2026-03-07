'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type CreateRoomPayload = {
  language: string;
  topic: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  maxParticipants: number;
  visibility: 'PUBLIC' | 'PRIVATE';
  countryFlags: string[];
};

const defaultForm: CreateRoomPayload = {
  language: 'English',
  topic: '',
  level: 'INTERMEDIATE',
  maxParticipants: 8,
  visibility: 'PUBLIC',
  countryFlags: ['US', 'IN']
};

export function CreateRoomForm() {
  const router = useRouter();
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CreateRoomPayload>(defaultForm);
  const flagInput = useMemo(() => form.countryFlags.join(', '), [form.countryFlags]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (status !== 'authenticated') {
      await signIn('google', { callbackUrl: '/' });
      return;
    }

    try {
      setBusy(true);
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? 'Failed to create room');
      }

      const data = await response.json();
      router.push(`/room/${data.roomId}`);
      router.refresh();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create room.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[var(--font-space-grotesk)] text-lg font-semibold text-slate-900">Start a room</h2>
          <p className="text-sm text-slate-600">Create a speaking circle and invite global learners.</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>{open ? 'Close' : 'Create Room'}</Button>
      </div>

      {open ? (
        <form onSubmit={onSubmit} className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            Topic
            <Input
              required
              placeholder="Daily life conversation"
              value={form.topic}
              onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))}
            />
          </label>

          <label className="text-sm text-slate-600">
            Language
            <Input value={form.language} onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))} />
          </label>

          <label className="text-sm text-slate-600">
            Level
            <Select
              value={form.level}
              onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value as CreateRoomPayload['level'] }))}
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </Select>
          </label>

          <label className="text-sm text-slate-600">
            Max participants
            <Input
              required
              type="number"
              min={2}
              max={24}
              value={form.maxParticipants}
              onChange={(e) => setForm((prev) => ({ ...prev, maxParticipants: Number(e.target.value) }))}
            />
          </label>

          <label className="text-sm text-slate-600">
            Visibility
            <Select
              value={form.visibility}
              onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value as CreateRoomPayload['visibility'] }))}
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </Select>
          </label>

          <label className="text-sm text-slate-600">
            Country flags (ISO codes)
            <Input
              placeholder="US, IN, BR"
              value={flagInput}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  countryFlags: e.target.value
                    .split(',')
                    .map((flag) => flag.trim().toUpperCase())
                    .filter(Boolean)
                }))
              }
            />
          </label>

          {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}

          <Button className="md:col-span-2" type="submit" disabled={busy}>
            {busy ? 'Creating room...' : 'Create and Join'}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
