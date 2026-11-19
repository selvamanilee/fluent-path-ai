import { z } from 'zod';
import { NextResponse } from 'next/server';
import { route, body } from '@/lib/http';
import { one, q } from '@/lib/db';
import { refreshCookie } from '@/lib/auth';

export const GET = route({}, async ({ userId }) => {
  const u = await one<any>('SELECT id, email, display_name, created_at FROM users WHERE id=$1', [userId]);
  const profile = await one<any>(`SELECT p.*, l.name AS level_name FROM learner_profiles p JOIN learning_levels l ON l.id=p.level_id WHERE p.user_id=$1`, [userId]);
  const preferences = await one<any>('SELECT theme, tamil_support, voice_enabled, speech_rate, audio_retention_days FROM user_preferences WHERE user_id=$1', [userId]);
  return { user: { id: u.id, email: u.email, displayName: u.display_name, createdAt: u.created_at, onboarded: !!profile.onboarded_at }, profile, preferences };
});

// Account deletion: removes the user and (via ON DELETE CASCADE) all learner data.
export const DELETE = route({}, async ({ req, userId }) => {
  await body(req, z.object({ confirm: z.literal('DELETE') }));
  await q('DELETE FROM users WHERE id=$1', [userId]);
  const res = NextResponse.json({ data: { ok: true } });
  res.headers.append('Set-Cookie', refreshCookie(null));
  return res;
});
