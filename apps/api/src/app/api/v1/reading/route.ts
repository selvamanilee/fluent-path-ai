import { route } from '@/lib/http';
import { q } from '@/lib/db';
export const GET = route({}, async ({ userId }) => q(`SELECT r.id, r.title, r.level_id, r.source, cp.best_score::float, coalesce(cp.attempts,0) AS attempts
  FROM reading_passages r LEFT JOIN content_progress cp ON cp.user_id=$1 AND cp.content_type='reading' AND cp.content_id=r.id ORDER BY r.level_id, r.sort`, [userId]));
