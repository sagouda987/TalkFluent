'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type LiveParticipant = {
  id: string;
  socketId?: string;
  userId: string;
  name: string;
  image: string | null;
  isMuted: boolean;
  isHost: boolean;
};

type ModerationEvent = {
  type: 'KICK' | 'BAN';
  reason: string;
};

type VoiceRoomOptions = {
  roomId: string;
  currentParticipant: LiveParticipant;
  onModeration: (event: ModerationEvent) => void;
};

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
};

export function useVoiceRoom({ roomId, currentParticipant, onModeration }: VoiceRoomOptions) {
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [localMuted, setLocalMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const mySocketIdRef = useRef<string>('');

  const closePeer = useCallback((peerSocketId: string) => {
    const existing = peersRef.current.get(peerSocketId);
    if (!existing) return;

    existing.close();
    peersRef.current.delete(peerSocketId);
    setRemoteStreams((prev) => {
      const copy = { ...prev };
      delete copy[peerSocketId];
      return copy;
    });
  }, []);

  const createPeerConnection = useCallback(
    async (peerSocketId: string, shouldOffer: boolean) => {
      if (!socketRef.current || !localStreamRef.current || peersRef.current.has(peerSocketId)) {
        return peersRef.current.get(peerSocketId) ?? null;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peersRef.current.set(peerSocketId, pc);

      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current as MediaStream);
      });

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;
        setRemoteStreams((prev) => ({ ...prev, [peerSocketId]: stream }));
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate || !socketRef.current) return;
        socketRef.current.emit('webrtc:ice-candidate', {
          roomId,
          to: peerSocketId,
          from: mySocketIdRef.current,
          candidate: event.candidate.toJSON()
        });
      };

      pc.onconnectionstatechange = () => {
        if (['closed', 'disconnected', 'failed'].includes(pc.connectionState)) {
          closePeer(peerSocketId);
        }
      };

      if (shouldOffer && socketRef.current) {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
        await pc.setLocalDescription(offer);
        socketRef.current.emit('webrtc:offer', {
          roomId,
          to: peerSocketId,
          from: mySocketIdRef.current,
          sdp: offer
        });
      }

      return pc;
    },
    [closePeer, roomId]
  );

  const syncPeers = useCallback(
    async (latestParticipants: LiveParticipant[]) => {
      const mySocketId = mySocketIdRef.current;
      if (!mySocketId) return;

      const remoteSocketIds = new Set(
        latestParticipants.map((participant) => participant.socketId).filter((id): id is string => Boolean(id && id !== mySocketId))
      );

      for (const participant of latestParticipants) {
        const peerSocketId = participant.socketId;
        if (!peerSocketId || peerSocketId === mySocketId) continue;
        if (peersRef.current.has(peerSocketId)) continue;

        const shouldOffer = mySocketId < peerSocketId;
        await createPeerConnection(peerSocketId, shouldOffer);
      }

      for (const existingPeer of Array.from(peersRef.current.keys())) {
        if (!remoteSocketIds.has(existingPeer)) {
          closePeer(existingPeer);
        }
      }
    },
    [closePeer, createPeerConnection]
  );

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
      } catch {
        onModeration({ type: 'KICK', reason: 'Microphone access denied. Please allow audio permissions.' });
        return;
      }

      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.NEXT_PUBLIC_APP_URL;
      const socket = io(socketUrl, {
        transports: ['websocket']
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        mySocketIdRef.current = socket.id ?? '';
        socket.emit('join-room', {
          roomId,
          participant: currentParticipant
        });
        setConnected(true);
      });

      socket.on('participants:update', async ({ participants: list }: { participants: LiveParticipant[] }) => {
        if (!mounted) return;
        setParticipants(list);
        await syncPeers(list);
      });

      socket.on('webrtc:offer', async ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
        const pc = await createPeerConnection(from, false);
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc:answer', {
          roomId,
          to: from,
          from: mySocketIdRef.current,
          sdp: answer
        });
      });

      socket.on('webrtc:answer', async ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
        const pc = peersRef.current.get(from);
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      });

      socket.on('webrtc:ice-candidate', async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
        const pc = peersRef.current.get(from);
        if (!pc) return;
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.on('moderation:action', (event: ModerationEvent) => {
        onModeration(event);
      });
    };

    boot();

    return () => {
      mounted = false;
      setConnected(false);
      socketRef.current?.disconnect();
      socketRef.current = null;

      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();

      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setRemoteStreams({});
      setParticipants([]);
    };
  }, [createPeerConnection, currentParticipant, onModeration, roomId, syncPeers]);

  const toggleMute = useCallback(() => {
    const nextMuted = !localMuted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    setLocalMuted(nextMuted);
    socketRef.current?.emit('toggle-mute', {
      roomId,
      userId: currentParticipant.userId,
      isMuted: nextMuted
    });
  }, [currentParticipant.userId, localMuted, roomId]);

  const emitKick = useCallback(
    (targetUserId: string, reason?: string) => {
      socketRef.current?.emit('moderation:kick', { roomId, targetUserId, reason });
    },
    [roomId]
  );

  const emitBan = useCallback(
    (targetUserId: string, reason?: string) => {
      socketRef.current?.emit('moderation:ban', { roomId, targetUserId, reason });
    },
    [roomId]
  );

  return {
    participants,
    remoteStreams,
    localMuted,
    connected,
    toggleMute,
    emitKick,
    emitBan
  };
}
