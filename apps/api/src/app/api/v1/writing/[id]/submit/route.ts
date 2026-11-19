import { z } from 'zod';
import { route, body, parseId, cleanText } from '@/lib/http';
import { one, tx } from '@/lib/db';
import { notFound } from '@/lib/errors';
import { scoreWriting } from '@/lib/content';
import { learnerCtx, getProfile } from '@/lib/learner';
import { recordScore, recordMistakes, touchStreak, checkAchievements } from '@/lib/progress';
import { saveContentProgress } from '@/lib/activities';

export const POST = route<{ id: string }>({ limit: 'ai' }, async ({ req, userId, params }) => {
  const id = parseId(params.id);
  const b = await body(req, z.object({ text: cleanText(5000).pipe(z.string().min(1, 'Please write your answer first.')) }));
  const w = await one<any>('SELECT * FROM writing_exercises WHERE id=$1', [id]);
  if (!w) throw notFound('Exercise');
  const ev = await scoreWriting(w, b.text, await learnerCtx(userId));
  const tz = (await getProfile(userId)).timezone;
  const achievements = await tx(async c => {
    await recordScore(c, userId, 'write', ev.score, 'writing', id, ev.evaluator);
    await recordMistakes(c, userId, 'write', ev.corrections);
    await saveContentProgress(c, userId, 'writing', id, ev.score);
    await touchStreak(c, userId, tz);
    return checkAchievements(c, userId);
  });
  return { ...ev, achievements };
});
