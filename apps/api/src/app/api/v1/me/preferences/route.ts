import { z } from 'zod';
import { route, body } from '@/lib/http';
import { one } from '@/lib/db';

const Z = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  tamilSupport: z.enum(['always', 'when_needed', 'off']).optional(),
  voiceEnabled: z.boolean().optional(),
  speechRate: z.number().min(0.5).max(1.5).optional(),
  audioRetentionDays: z.number().int().min(0).max(30).optional(),
});

export const PUT = route({}, async ({ req, userId }) => {
  const b = await body(req, Z);
  return one(`UPDATE user_preferences SET
      theme=coalesce($2,theme), tamil_support=coalesce($3,tamil_support), voice_enabled=coalesce($4,voice_enabled),
      speech_rate=coalesce($5,speech_rate), audio_retention_days=coalesce($6,audio_retention_days), updated_at=now()
    WHERE user_id=$1 RETURNING theme, tamil_support, voice_enabled, speech_rate, audio_retention_days`,
    [userId, b.theme ?? null, b.tamilSupport ?? null, b.voiceEnabled ?? null, b.speechRate ?? null, b.audioRetentionDays ?? null]);
});
