import { z } from 'zod';

export const createRoomSchema = z.object({
  language: z.string().min(2).max(40),
  topic: z.string().min(3).max(120),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  maxParticipants: z.number().int().min(2).max(24),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
  countryFlags: z.array(z.string()).max(5).default([])
});

export const reportSchema = z.object({
  reason: z.string().min(5).max(400),
  targetUserId: z.string().optional()
});

export const moderationSchema = z.object({
  targetUserId: z.string(),
  reason: z.string().min(3).max(250).optional()
});
