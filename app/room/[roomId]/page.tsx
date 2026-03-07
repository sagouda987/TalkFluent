import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getRoomById } from '@/lib/actions/rooms';
import { getCurrentUser } from '@/lib/current-user';
import { RoomClient } from '@/components/room/room-client';

export const dynamic = 'force-dynamic';

export default async function RoomPage({ params }: { params: { roomId: string } }) {
  const [room, user] = await Promise.all([getRoomById(params.roomId), getCurrentUser()]);

  if (!room) {
    notFound();
  }

  const currentUser = user
    ? {
        id: user.id,
        name: user.name ?? user.email ?? 'Learner',
        image: user.image ?? null
      }
    : null;

  return (
    <>
      <div className="section-shell pt-5">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ChevronLeft className="h-4 w-4" /> Back to rooms
        </Link>
      </div>
      <RoomClient room={room} user={currentUser} />
    </>
  );
}
