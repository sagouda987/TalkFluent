import Link from 'next/link';
import { Globe2, Headphones, Languages } from 'lucide-react';
import { getPublicRooms } from '@/lib/actions/rooms';
import { RoomCard } from '@/components/room/room-card';
import { CreateRoomForm } from '@/components/room/create-room-form';
import { AuthActions } from '@/components/auth-actions';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const rooms = await getPublicRooms();

  return (
    <main className="section-shell py-6 md:py-10">
      <header className="surface mb-5 overflow-hidden p-5 md:p-8">
        <nav className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="font-[var(--font-space-grotesk)] text-xl font-bold text-slate-900">
            TalkFluent
          </Link>
          <AuthActions />
        </nav>

        <div className="grid gap-6 lg:grid-cols-[1fr,300px] lg:items-end">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
              Real-time language exchange
            </p>
            <h1 className="font-[var(--font-space-grotesk)] text-3xl font-bold leading-tight text-slate-900 md:text-5xl">
              Practice spoken English in live global voice rooms.
            </h1>
            <p className="mt-4 max-w-2xl text-slate-600 md:text-lg">
              Find focused speaking topics, connect with learners worldwide, and improve confidence through natural conversation.
            </p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/80 bg-white/75 p-4 backdrop-blur">
            <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
              <Languages className="h-4 w-4 text-brand-600" /> Multi-language communities
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
              <Headphones className="h-4 w-4 text-brand-600" /> Browser-based voice chat
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
              <Globe2 className="h-4 w-4 text-brand-600" /> Learners from around the world
            </div>
          </div>
        </div>
      </header>

      <div className="mb-5">
        <CreateRoomForm />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[var(--font-space-grotesk)] text-2xl font-semibold text-slate-900">Public Voice Rooms</h2>
          <span className="text-sm text-slate-500">{rooms.length} live rooms</span>
        </div>

        {rooms.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        ) : (
          <div className="surface p-10 text-center text-slate-600">No rooms are live right now. Create the first one.</div>
        )}
      </section>
    </main>
  );
}
