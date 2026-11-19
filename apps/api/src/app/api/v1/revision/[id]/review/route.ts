import { z } from 'zod';
import { route, body, parseId } from '@/lib/http';
import { one, tx } from '@/lib/db';
import { notFound } from '@/lib/errors';
import { isCorrect } from '@/lib/evaluate';
import { reviewItem } from '@/lib/activities';
import { getProfile } from '@/lib/learner';
import { touchStreak } from '@/lib/progress';

// The server checks the answer itself — the client never sees the expected answer before attempting.
export const POST = route<{ id: string }>({}, async ({ req, params, userId }) => {
  const id = parseId(params.id);
  const b = await body(req, z.object({ answer: z.string().max(1000) }));
  const r = await one<any>(`SELECT rs.*, v.word, p.text AS phrase, m.corrected FROM revision_schedules rs
      LEFT JOIN vocabulary v ON rs.item_type='vocabulary' AND v.id=rs.item_id
      LEFT JOIN phrases p ON rs.item_type='phrase' AND p.id=rs.item_id
      LEFT JOIN mistake_records m ON rs.item_type='mistake' AND m.id=rs.item_id WHERE rs.id=$1 AND rs.user_id=$2`, [id, userId]);
  if (!r) throw notFound('Revision item');
  const expected = r.word ?? r.phrase ?? r.corrected;
  const correct = isCorrect(b.answer, [expected]);
  const tz = (await getProfile(userId)).timezone;
  const next = await tx(async c => { const n = await reviewItem(c, userId, id, correct); await touchStreak(c, userId, tz); return n; });
  return { correct, expected, nextDueAt: next?.dueAt, stage: next?.stage };
});
