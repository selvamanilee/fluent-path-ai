import { route } from '@/lib/http';
import { q } from '@/lib/db';

const STAGES = ['Foundation', 'Basic Grammar', 'Tenses', 'Intermediate', 'Advanced'];
export const GET = route({}, async ({ userId }) => {
  const rows = await q<any>(`SELECT gt.stage, gt.slug, gt.title, (l.id IS NOT NULL) AS available, l.source, cp.best_score::float, cp.attempts
                             FROM grammar_topics gt LEFT JOIN lessons l ON l.grammar_topic_id=gt.id
                             LEFT JOIN content_progress cp ON cp.user_id=$1 AND cp.content_type='grammar' AND cp.content_id=gt.id
                             ORDER BY gt.stage, gt.sort`, [userId]);
  return STAGES.map((name, i) => ({ stage: i + 1, name, topics: rows.filter(r => r.stage === i + 1) }));
});
