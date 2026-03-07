import { NextRequest, NextResponse } from 'next/server';
import { moderationSchema } from '@/lib/validators';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const room = await prisma.room.findUnique({ where: { id: params.roomId } });

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (room.hostId !== user.id) {
    return NextResponse.json({ error: 'Only host can ban users' }, { status: 403 });
  }

  const payload = await req.json();
  const parsed = moderationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.ban.upsert({
    where: {
      roomId_userId: {
        roomId: room.id,
        userId: parsed.data.targetUserId
      }
    },
    update: {
      reason: parsed.data.reason,
      issuedById: user.id,
      expiresAt: null
    },
    create: {
      roomId: room.id,
      userId: parsed.data.targetUserId,
      issuedById: user.id,
      reason: parsed.data.reason,
      expiresAt: null
    }
  });

  await prisma.participant.updateMany({
    where: {
      roomId: room.id,
      userId: parsed.data.targetUserId,
      leftAt: null
    },
    data: {
      leftAt: new Date()
    }
  });

  return NextResponse.json({ ok: true, targetUserId: parsed.data.targetUserId, reason: parsed.data.reason ?? '' });
}
