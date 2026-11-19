import { route } from '@/lib/http';
import { tx, q, one } from '@/lib/db';
import { requireOnboarded, getProfile } from '@/lib/learner';
import { getOrCreateToday } from '@/lib/plan';

export const GET = route({}, async ({ userId }) => {
  await requireOnboarded(userId);
  // Serialize day creation per user so two tabs can't create two days.
  const dayId = await tx(async c => {
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId]);
    return getOrCreateToday(c, userId, await getProfile(userId, c));
  });
  const day = await one<any>(`SELECT id, day_number, to_char(local_date,'YYYY-MM-DD') AS local_date, title, status, seconds_spent, level_id FROM learning_days WHERE id=$1`, [dayId]);
  const activities = await q<any>(`SELECT id, seq, kind, title, minutes, content, state, status, score, result, completed_at FROM learning_activities WHERE learning_day_id=$1 ORDER BY seq`, [dayId]);
  return { day, activities, currentIndex: Math.max(0, activities.findIndex(a => a.status !== 'done')) };
});
