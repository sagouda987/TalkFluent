import { RoomLevel, RoomVisibility } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { RoomListItem } from '@/types/room';

export type RoomDetail = {
  id: string;
  topic: string;
  language: string;
  level: RoomLevel;
  visibility: RoomVisibility;
  maxParticipants: number;
  countryFlags: string[];
  hostId: string;
  hostName: string;
  participantCount: number;
};

export async function getPublicRooms(): Promise<RoomListItem[]> {
  const rooms = await prisma.room.findMany({
    where: { visibility: 'PUBLIC' },
    include: {
      host: { select: { name: true } },
      _count: {
        select: {
          participants: {
            where: {
              leftAt: null
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return rooms.map((room) => ({
    id: room.id,
    topic: room.topic,
    language: room.language,
    level: room.level,
    hostName: room.host.name ?? 'Host',
    participantCount: room._count.participants,
    maxParticipants: room.maxParticipants,
    visibility: room.visibility,
    countryFlags: room.countryFlags,
    createdAt: room.createdAt.toISOString()
  }));
}

export async function getRoomById(roomId: string): Promise<RoomDetail | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      host: { select: { name: true } },
      _count: {
        select: {
          participants: {
            where: {
              leftAt: null
            }
          }
        }
      }
    }
  });

  if (!room) {
    return null;
  }

  return {
    id: room.id,
    topic: room.topic,
    language: room.language,
    level: room.level,
    visibility: room.visibility,
    maxParticipants: room.maxParticipants,
    countryFlags: room.countryFlags,
    hostId: room.hostId,
    hostName: room.host.name ?? 'Host',
    participantCount: room._count.participants
  };
}
