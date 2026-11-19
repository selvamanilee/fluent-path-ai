import { z } from 'zod';
import { route, body, parseId } from '@/lib/http';
import { one, tx } from '@/lib/db';
import { notFound } from '@/lib/errors';
import { scoreReading } from '@/lib/content';
import { getProfile } from '@/lib/learner';
import { recordScore, touchStreak } from '@/lib/progress';
import { saveContentProgress } from '@/lib/activities';

export const POST = route<{ id: string }>({}, async ({ req, userId, params }) => {
  const id = parseId(params.id);
  const b = await body(req, z.object({ answers: z.array(z.string().max(500)).max(20) }));
  const r = await one<any>('SELECT * FROM reading_passages WHERE id=$1', [id]);
  if (!r) throw notFound('Passage');
  const res = scoreReading(r.questions, b.answers);
  const tz = (await getProfile(userId)).timezone;
  await tx(async c => {
    await recordScore(c, userId, 'read', res.score, 'reading', id, 'objective');
    await saveContentProgress(c, userId, 'reading', id, res.score);
    await touchStreak(c, userId, tz);
  });
  return res;
});
