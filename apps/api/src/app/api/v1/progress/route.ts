import { route } from '@/lib/http';
import { q, one } from '@/lib/db';
import { requireOnboarded } from '@/lib/learner';
import { evaluatePromotion } from '@/lib/exams';
import { pool } from '@/lib/db';

export const GET = route({}, async ({ userId }) => {
  const p = await requireOnboarded(userId);
  const [level, skills, history, mistakes, vocab, exams, achievements, readiness] = await Promise.all([
    one<any>('SELECT id, name, description FROM learning_levels WHERE id=$1', [p.level_id]),
    q<any>(`SELECT skill, round(avg(score))::int AS avg, count(*)::int AS attempts, max(created_at) AS last FROM skill_scores WHERE user_id=$1 GROUP BY skill`, [userId]),
    q<any>(`SELECT to_char(date_trunc('day', created_at),'YYYY-MM-DD') AS date, skill, round(avg(score))::int AS score
            FROM skill_scores WHERE user_id=$1 AND created_at > now() - interval '28 days' GROUP BY 1,2 ORDER BY 1`, [userId]),
    q<any>(`SELECT category, sum(occurrences)::int AS count, max(last_seen_at) AS last,
              (array_agg(original ORDER BY last_seen_at DESC))[1] AS example_original, (array_agg(corrected ORDER BY last_seen_at DESC))[1] AS example_corrected
            FROM mistake_records WHERE user_id=$1 AND resolved_at IS NULL GROUP BY category ORDER BY count DESC LIMIT 8`, [userId]),
    one<any>(`SELECT count(*)::int AS learned, count(*) FILTER (WHERE status='mastered')::int AS mastered FROM vocabulary_progress WHERE user_id=$1`, [userId]),
    q<any>(`SELECT DISTINCT ON (exam_type) exam_type, percent::float, submitted_at FROM exam_attempts WHERE user_id=$1 AND submitted_at IS NOT NULL AND exam_type<>'mini' ORDER BY exam_type, submitted_at DESC`, [userId]),
    q<any>(`SELECT a.code, a.title, a.description, a.icon, ua.earned_at FROM achievements a LEFT JOIN user_achievements ua ON ua.achievement_code=a.code AND ua.user_id=$1 ORDER BY ua.earned_at NULLS LAST, a.code`, [userId]),
    (async () => {
      const c = await pool().connect();
      try { await c.query('BEGIN READ ONLY'); return await evaluatePromotion(c, userId); } finally { await c.query('ROLLBACK'); c.release(); }
    })(),
  ]);
  return { level, skills, history, mistakes, vocabulary: vocab, latestExams: exams, achievements, readiness };
});
