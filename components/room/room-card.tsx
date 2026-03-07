import { cn, levelLabel, toFlagEmoji } from '@/lib/utils';
import { RoomListItem } from '@/types/room';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, Globe, Mic } from 'lucide-react';

type RoomCardProps = {
  room: RoomListItem;
};

export function RoomCard({ room }: RoomCardProps) {
  return (
    <article className="surface p-5 transition hover:-translate-y-0.5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-[var(--font-space-grotesk)] text-lg font-semibold text-slate-900">{room.topic}</h3>
          <p className="mt-1 text-sm text-slate-500">Hosted by {room.hostName}</p>
        </div>
        <Badge className={cn(room.visibility === 'PUBLIC' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
          {room.visibility}
        </Badge>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge className="bg-brand-100 text-brand-700">{room.language}</Badge>
        <Badge>{levelLabel(room.level)}</Badge>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>
            {room.participantCount}/{room.maxParticipants}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="truncate">{room.countryFlags.length ? room.countryFlags.map(toFlagEmoji).join(' ') : 'Global'}</span>
        </div>
        <div className="col-span-2 flex items-center gap-2 text-slate-500">
          <Mic className="h-4 w-4" />
          <span>Live voice conversation</span>
        </div>
      </div>

      <Link href={`/room/${room.id}`} className="block">
        <Button className="w-full">Join Now</Button>
      </Link>
    </article>
  );
}
