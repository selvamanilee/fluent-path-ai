import { route } from '@/lib/http';
import { q } from '@/lib/db';
import { getProfile } from '@/lib/learner';
export const GET = route({}, async ({ userId }) => {
  const p = await getProfile(userId);
  const rows = await q<any>(`SELECT t.id, t.title AS title, t.level_id, t.source, cp.best_score::float, coalesce(cp.attempts,0) AS attempts, (t.level_id <= $2) AS unlocked
    FROM technical_scenarios t LEFT JOIN content_progress cp ON cp.user_id=$1 AND cp.content_type='technical' AND cp.content_id=t.id ORDER BY t.level_id, t.sort`, [userId, p.level_id]);
  return rows;
});
