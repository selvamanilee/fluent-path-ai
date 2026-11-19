import { route } from '@/lib/http';
import { q } from '@/lib/db';

export const GET = route({}, async ({ req, userId }) => {
  const kind = req.nextUrl.searchParams.get('kind') === 'phrasal_verb' ? 'phrasal_verb' : 'phrase';
  return q(`SELECT p.id, p.text, p.meaning, p.meaning_ta, p.pronunciation, p.example, p.situation, p.practice_question, p.level_id, p.source,
              (pp.phrase_id IS NOT NULL) AS learned
            FROM phrases p LEFT JOIN phrase_progress pp ON pp.phrase_id=p.id AND pp.user_id=$1 WHERE p.kind=$2 ORDER BY p.level_id, p.sort`, [userId, kind]);
});
