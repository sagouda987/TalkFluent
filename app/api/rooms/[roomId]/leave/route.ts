import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

export async function POST(_: Request, { params }: { params: { roomId: string } }) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.participant.updateMany({
    where: {
      roomId: params.roomId,
      userId: user.id,
      leftAt: null
    },
    data: {
      leftAt: new Date()
    }
  });

  return NextResponse.json({ ok: true });
}
