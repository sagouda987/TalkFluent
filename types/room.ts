// app-wide domain types
export type RoomLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type RoomVisibility = 'PUBLIC' | 'PRIVATE';

export type RoomListItem = {
  id: string;
  topic: string;
  language: string;
  level: RoomLevel;
  hostName: string;
  participantCount: number;
  maxParticipants: number;
  visibility: RoomVisibility;
  countryFlags: string[];
  createdAt: string;
};

export type RoomParticipant = {
  id: string;
  userId: string;
  name: string;
  image: string | null;
  isMuted: boolean;
  isHost: boolean;
};
