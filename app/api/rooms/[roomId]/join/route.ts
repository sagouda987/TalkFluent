import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

export async function POST(_: Request, { params }: { params: { roomId: string } }) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const room = await prisma.room.findUnique({
    where: { id: params.roomId },
    include: {
      _count: {
        select: {
          participants: {
            where: { leftAt: null }
          }
        }
      }
    }
  });

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const activeBan = await prisma.ban.findUnique({
    where: {
      roomId_userId: {
        roomId: room.id,
        userId: user.id
      }
    }
  });

  if (activeBan && (!activeBan.expiresAt || activeBan.expiresAt > new Date())) {
    return NextResponse.json({ error: 'You are banned from this room' }, { status: 403 });
  }

  if (room._count.participants >= room.maxParticipants) {
    return NextResponse.json({ error: 'Room is full' }, { status: 409 });
  }

  await prisma.participant.updateMany({
    where: { roomId: room.id, userId: user.id, leftAt: null },
    data: { leftAt: new Date() }
  });

  const participant = await prisma.participant.create({
    data: {
      roomId: room.id,
      userId: user.id
    }
  });

  return NextResponse.json({
    participant: {
      id: participant.id,
      userId: user.id,
      name: user.name ?? user.email ?? 'Learner',
      image: user.image ?? null,
      isMuted: false,
      isHost: room.hostId === user.id
    }
  });
}
