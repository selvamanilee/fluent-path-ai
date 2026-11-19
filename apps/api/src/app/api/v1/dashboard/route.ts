import { route } from '@/lib/http';
import { one, q } from '@/lib/db';
import { requireOnboarded, localDate } from '@/lib/learner';

export const GET = route({}, async ({ userId }) => {
  const p = await requireOnboarded(userId);
  const [user, level, streak, today, skills, revisionDue, achievements, weekly, totals, nextWords] = await Promise.all([
    one<any>('SELECT display_name FROM users WHERE id=$1', [userId]),
    one<any>('SELECT id, name, description FROM learning_levels WHERE id=$1', [p.level_id]),
    one<any>('SELECT current, longest FROM learning_streaks WHERE user_id=$1', [userId]),
    one<any>(`SELECT d.id, d.day_number, d.title, d.status, d.seconds_spent,
                (SELECT count(*) FROM learning_activities a WHERE a.learning_day_id=d.id)::int AS total,
                (SELECT count(*) FROM learning_activities a WHERE a.learning_day_id=d.id AND a.status='done')::int AS done,
                (SELECT content FROM learning_activities a WHERE a.learning_day_id=d.id AND a.kind='grammar') AS grammar,
                (SELECT content->'words' FROM learning_activities a WHERE a.learning_day_id=d.id AND a.kind='vocabulary') AS words,
                (SELECT jsonb_build_object('status', status, 'score', score) FROM learning_activities a WHERE a.learning_day_id=d.id AND a.kind='mini_exam') AS mini_exam
              FROM learning_days d WHERE d.user_id=$1 ORDER BY d.day_number DESC LIMIT 1`, [userId]),
    q<any>(`SELECT skill, round(avg(score))::int AS avg, count(*)::int AS n FROM (
              SELECT skill, score, row_number() OVER (PARTITION BY skill ORDER BY created_at DESC) rn FROM skill_scores WHERE user_id=$1) s
            WHERE rn <= 5 GROUP BY skill`, [userId]),
    one<any>(`SELECT count(*)::int AS n FROM revision_schedules WHERE user_id=$1 AND stage < 5 AND due_at <= now()`, [userId]),
    q<any>(`SELECT a.code, a.title, a.icon, ua.earned_at FROM user_achievements ua JOIN achievements a ON a.code=ua.achievement_code WHERE ua.user_id=$1 ORDER BY ua.earned_at DESC LIMIT 3`, [userId]),
    q<any>(`SELECT to_char(local_date,'YYYY-MM-DD') AS date, sum(seconds_spent)::int AS seconds FROM learning_days WHERE user_id=$1 AND local_date > ($2::date - 7) GROUP BY local_date`, [userId, localDate(p.timezone)]),
    one<any>(`SELECT coalesce(sum(seconds_spent),0)::int AS seconds, count(*) FILTER (WHERE status='completed')::int AS days FROM learning_days WHERE user_id=$1`, [userId]),
    q<any>(`SELECT v.word, v.meaning_ta FROM vocabulary v JOIN vocabulary_categories vc ON vc.id=v.category_id
            WHERE v.level_id <= $2 AND vc.min_level <= $2 AND NOT EXISTS (SELECT 1 FROM vocabulary_progress vp WHERE vp.user_id=$1 AND vp.vocabulary_id=v.id)
            ORDER BY vc.sort, v.sort LIMIT 5`, [userId, p.level_id]),
  ]);
  const todayStr = localDate(p.timezone);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(new Date(todayStr + 'T00:00:00Z').getTime() - (6 - i) * 86400_000).toISOString().slice(0, 10);
    return { date: d, minutes: Math.round((weekly.find(w => w.date === d)?.seconds ?? 0) / 60) };
  });
  const skill = (k: string) => skills.find(s => s.skill === k) ?? { skill: k, avg: null, n: 0 };
  return {
    greeting: user.display_name, level, dayNumber: today?.day_number ?? 1, streak: streak ?? { current: 0, longest: 0 },
    today: today ? { id: today.id, title: today.title, status: today.status, done: today.done, total: today.total, minutes: Math.round(today.seconds_spent / 60), targetMinutes: p.daily_minutes } : null,
    skills: { read: skill('read'), write: skill('write'), speak: skill('speak'), lesson: skill('lesson') },
    vocabularyPreview: (today?.words ?? nextWords).slice(0, 5).map((w: any) => ({ word: w.word, meaning_ta: w.meaning_ta })),
    grammarTopic: today?.grammar ? { title: today.grammar.title, slug: today.grammar.slug } : null,
    revisionDue: revisionDue?.n ?? 0,
    miniExam: today?.mini_exam ?? null,
    weekly: week,
    learningTime: { totalMinutes: Math.round((totals?.seconds ?? 0) / 60), daysCompleted: totals?.days ?? 0 },
    achievements,
  };
});
