'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, PhoneOff, ShieldAlert, UserRound, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { levelLabel, toFlagEmoji } from '@/lib/utils';
import { useVoiceRoom } from '@/hooks/use-voice-room';

type RoomDetail = {
  id: string;
  topic: string;
  language: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  visibility: 'PUBLIC' | 'PRIVATE';
  maxParticipants: number;
  countryFlags: string[];
  hostId: string;
  hostName: string;
};

type CurrentUser = {
  id: string;
  name: string;
  image: string | null;
};

type JoinedParticipant = {
  id: string;
  userId: string;
  name: string;
  image: string | null;
  isMuted: boolean;
  isHost: boolean;
};

type RoomClientProps = {
  room: RoomDetail;
  user: CurrentUser | null;
};

function RemoteAudio({ streams }: { streams: Record<string, MediaStream> }) {
  const entries = useMemo(() => Object.entries(streams), [streams]);

  return (
    <>
      {entries.map(([socketId, stream]) => (
        <audio
          key={socketId}
          autoPlay
          playsInline
          ref={(el) => {
            if (!el || el.srcObject === stream) return;
            el.srcObject = stream;
          }}
        />
      ))}
    </>
  );
}

function ActiveRoom({ room, joinedParticipant }: { room: RoomDetail; joinedParticipant: JoinedParticipant }) {
  const router = useRouter();
  const [alert, setAlert] = useState('');
  const [moderating, setModerating] = useState<string | null>(null);

  const leaveRoom = useCallback(async () => {
    await fetch(`/api/rooms/${room.id}/leave`, { method: 'POST' });
    router.push('/');
    router.refresh();
  }, [room.id, router]);

  const { participants, remoteStreams, localMuted, connected, toggleMute, emitKick, emitBan } = useVoiceRoom({
    roomId: room.id,
    currentParticipant: joinedParticipant,
    onModeration: ({ type, reason }) => {
      setAlert(`${type === 'BAN' ? 'Banned' : 'Removed'}: ${reason}`);
      leaveRoom().catch(() => undefined);
    }
  });

  useEffect(() => {
    const closeRoom = () => {
      navigator.sendBeacon(`/api/rooms/${room.id}/leave`);
    };

    window.addEventListener('beforeunload', closeRoom);
    return () => window.removeEventListener('beforeunload', closeRoom);
  }, [room.id]);

  async function reportRoom() {
    const reason = window.prompt('Describe the issue to report:');
    if (!reason) return;

    await fetch(`/api/rooms/${room.id}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    setAlert('Report submitted. Moderators will review it.');
  }

  async function moderate(action: 'kick' | 'ban', targetUserId: string) {
    try {
      setModerating(`${action}:${targetUserId}`);
      const reason = window.prompt(`Optional reason to ${action}:`) ?? undefined;
      const response = await fetch(`/api/rooms/${room.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, reason })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? 'Moderation action failed');
      }

      if (action === 'kick') {
        emitKick(targetUserId, reason);
      } else {
        emitBan(targetUserId, reason);
      }
    } catch (error) {
      setAlert(error instanceof Error ? error.message : 'Moderation failed.');
    } finally {
      setModerating(null);
    }
  }

  return (
    <main className="section-shell py-6 md:py-10">
      <RemoteAudio streams={remoteStreams} />

      <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-sky-600 p-6 text-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-white/80">Live Room</p>
            <h1 className="font-[var(--font-space-grotesk)] text-2xl font-bold md:text-3xl">{room.topic}</h1>
            <p className="mt-1 text-sm text-white/85">Hosted by {room.hostName}</p>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-white/20 text-white">{room.language}</Badge>
            <Badge className="bg-white/20 text-white">{levelLabel(room.level)}</Badge>
            <Badge className="bg-white/20 text-white">{room.countryFlags.map(toFlagEmoji).join(' ') || '??'}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-white/90">
          <Volume2 className="h-4 w-4" />
          <span>{connected ? 'Connected to voice network' : 'Connecting...'}</span>
        </div>
      </div>

      {alert ? <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{alert}</div> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
        <section className="surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[var(--font-space-grotesk)] text-lg font-semibold text-slate-900">Voice controls</h2>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={reportRoom}>
                <ShieldAlert className="mr-2 h-4 w-4" /> Report
              </Button>
              <Button variant={localMuted ? 'danger' : 'secondary'} onClick={toggleMute}>
                {localMuted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                {localMuted ? 'Unmute' : 'Mute'}
              </Button>
              <Button variant="danger" onClick={leaveRoom}>
                <PhoneOff className="mr-2 h-4 w-4" /> Leave Room
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {participants.map((participant) => (
              <div key={participant.socketId ?? participant.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{participant.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{participant.isHost ? 'Host' : 'Participant'}</p>
                  </div>
                  <Badge className={participant.isMuted ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}>
                    {participant.isMuted ? 'Muted' : 'Speaking'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="surface p-5">
          <h2 className="font-[var(--font-space-grotesk)] text-lg font-semibold text-slate-900">Participants ({participants.length})</h2>
          <div className="mt-3 space-y-2">
            {participants.map((participant) => (
              <div key={participant.socketId ?? participant.id} className="rounded-xl border border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{participant.name}</p>
                    <p className="text-xs text-slate-500">{participant.isHost ? 'Host' : 'Learner'}</p>
                  </div>
                  {participant.isMuted ? <MicOff className="h-4 w-4 text-rose-500" /> : <UserRound className="h-4 w-4 text-emerald-600" />}
                </div>

                {joinedParticipant.isHost && !participant.isHost ? (
                  <div className="mt-2 flex gap-2">
                    <Button
                      className="w-full"
                      variant="secondary"
                      disabled={moderating === `kick:${participant.userId}`}
                      onClick={() => moderate('kick', participant.userId)}
                    >
                      Kick
                    </Button>
                    <Button
                      className="w-full"
                      variant="danger"
                      disabled={moderating === `ban:${participant.userId}`}
                      onClick={() => moderate('ban', participant.userId)}
                    >
                      Ban
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}

export function RoomClient({ room, user }: RoomClientProps) {
  const router = useRouter();
  const [joinedParticipant, setJoinedParticipant] = useState<JoinedParticipant | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const join = async () => {
      if (!user?.id) {
        setError('Please sign in to join this room.');
        return;
      }

      try {
        const response = await fetch(`/api/rooms/${room.id}/join`, { method: 'POST' });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? 'Unable to join room.');
        }

        const data = await response.json();
        if (active) {
          setJoinedParticipant(data.participant);
        }
      } catch (joinError) {
        setError(joinError instanceof Error ? joinError.message : 'Unable to join room.');
      }
    };

    join();

    return () => {
      active = false;
      fetch(`/api/rooms/${room.id}/leave`, { method: 'POST' }).catch(() => undefined);
    };
  }, [room.id, user?.id]);

  if (!user?.id) {
    return (
      <main className="section-shell py-12">
        <section className="surface p-8">
          <h1 className="font-[var(--font-space-grotesk)] text-2xl font-semibold text-slate-900">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-600">Use Google sign-in to access live voice rooms.</p>
          <Button className="mt-5" onClick={() => router.push('/signin')}>
            Go to Sign in
          </Button>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="section-shell py-12">
        <section className="surface p-8">
          <h1 className="font-[var(--font-space-grotesk)] text-2xl font-semibold text-slate-900">Could not enter room</h1>
          <p className="mt-2 text-sm text-rose-600">{error}</p>
          <Button className="mt-5" onClick={() => router.push('/')}>
            Back to rooms
          </Button>
        </section>
      </main>
    );
  }

  if (!joinedParticipant) {
    return (
      <main className="section-shell py-12">
        <section className="surface p-8">
          <p className="text-slate-700">Joining room and starting audio...</p>
        </section>
      </main>
    );
  }

  return <ActiveRoom room={room} joinedParticipant={joinedParticipant} />;
}
