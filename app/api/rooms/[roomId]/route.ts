import { NextResponse } from 'next/server';
import { getRoomById } from '@/lib/actions/rooms';

export async function GET(_: Request, { params }: { params: { roomId: string } }) {
  const room = await getRoomById(params.roomId);

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  return NextResponse.json({ room });
}
