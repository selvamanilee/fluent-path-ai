import { route } from '@/lib/http';
import { q } from '@/lib/db';
export const GET = route({}, async ({ userId }) => q(`SELECT w.id, w.topic, w.level_id, w.source, cp.best_score::float, coalesce(cp.attempts,0) AS attempts
  FROM writing_exercises w LEFT JOIN content_progress cp ON cp.user_id=$1 AND cp.content_type='writing' AND cp.content_id=w.id ORDER BY w.level_id, w.sort`, [userId]));
