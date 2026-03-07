import { NextRequest, NextResponse } from 'next/server';
import { reportSchema } from '@/lib/validators';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await req.json();
  const parsed = reportSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.report.create({
    data: {
      roomId: params.roomId,
      reporterId: user.id,
      reason: parsed.data.reason,
      targetUserId: parsed.data.targetUserId
    }
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
