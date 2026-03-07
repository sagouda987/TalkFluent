import { NextRequest, NextResponse } from 'next/server';
import { createRoomSchema } from '@/lib/validators';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

export async function GET() {
  const rooms = await prisma.room.findMany({
    where: { visibility: 'PUBLIC' },
    include: {
      host: { select: { name: true } },
      _count: {
        select: {
          participants: {
            where: { leftAt: null }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    rooms: rooms.map((room) => ({
      id: room.id,
      topic: room.topic,
      language: room.language,
      level: room.level,
      visibility: room.visibility,
      hostName: room.host.name ?? 'Host',
      participantCount: room._count.participants,
      maxParticipants: room.maxParticipants,
      countryFlags: room.countryFlags,
      createdAt: room.createdAt.toISOString()
    }))
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createRoomSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const room = await prisma.room.create({
    data: {
      ...parsed.data,
      hostId: user.id,
      inviteCode: parsed.data.visibility === 'PRIVATE' ? crypto.randomUUID().slice(0, 8) : null
    }
  });

  return NextResponse.json({ roomId: room.id }, { status: 201 });
}
