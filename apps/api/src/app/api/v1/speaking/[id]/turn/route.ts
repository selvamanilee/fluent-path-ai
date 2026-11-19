import { z } from 'zod';
import { route, body, parseId, cleanText } from '@/lib/http';
import { one } from '@/lib/db';
import { ApiError, notFound } from '@/lib/errors';
import { getProfile } from '@/lib/learner';
import { practiceTurn } from '@/lib/sessions';

const Z = z.object({ index: z.number().int().min(0).max(50), transcript: cleanText(2000).pipe(z.string().min(1, 'Please answer before continuing.')), inputMode: z.enum(['text', 'voice']).default('text') });
export const POST = route<{ id: string }>({ limit: 'ai' }, async ({ req, userId, params }) => {
  const id = parseId(params.id);
  const b = await body(req, Z);
  const t = await one<any>('SELECT * FROM speaking_exercises WHERE id=$1', [id]);
  if (!t) throw notFound('Exercise');
  if (t.level_id > (await getProfile(userId)).level_id) throw new ApiError(403, 'LOCKED', 'This exercise is locked for your level.');
  return practiceTurn(userId, 'speaking', id, t.questions, b.index, b.transcript, b.inputMode);
});
