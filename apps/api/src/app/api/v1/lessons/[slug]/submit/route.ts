import { z } from 'zod';
import { route, body } from '@/lib/http';
import { tx } from '@/lib/db';
import { getLesson } from '@/lib/lessons';
import { scorePractice } from '@/lib/content';
import { learnerCtx, getProfile } from '@/lib/learner';
import { recordScore, recordMistakes, touchStreak } from '@/lib/progress';
import { saveContentProgress } from '@/lib/activities';

export const POST = route<{ slug: string }>({ limit: 'ai' }, async ({ req, userId, params }) => {
  const b = await body(req, z.object({ answers: z.array(z.string().max(2000)).max(30) }));
  const l = await getLesson(params.slug, userId);
  const r = await scorePractice(l.practice, b.answers, await learnerCtx(userId));
  const tz = (await getProfile(userId)).timezone;
  await tx(async c => {
    await recordScore(c, userId, 'lesson', r.score, 'lesson', l.topic_id, r.evaluator);
    await recordMistakes(c, userId, 'lesson', r.corrections);
    await saveContentProgress(c, userId, 'grammar', l.topic_id, r.score);
    await touchStreak(c, userId, tz);
  });
  return r;
});
