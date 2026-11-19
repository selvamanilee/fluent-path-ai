import { route } from '@/lib/http';
import { q } from '@/lib/db';
import { getProfile } from '@/lib/learner';

export const GET = route({}, async ({ userId }) => {
  const p = await getProfile(userId);
  return q(`SELECT vc.slug, vc.name, vc.name_ta, vc.icon, vc.min_level, (vc.min_level <= $2) AS unlocked,
              count(v.id)::int AS total, count(vp.vocabulary_id)::int AS learned, count(vp.vocabulary_id) FILTER (WHERE vp.status='mastered')::int AS mastered
            FROM vocabulary_categories vc LEFT JOIN vocabulary v ON v.category_id=vc.id
            LEFT JOIN vocabulary_progress vp ON vp.vocabulary_id=v.id AND vp.user_id=$1
            GROUP BY vc.id ORDER BY vc.sort`, [userId, p.level_id]);
});
