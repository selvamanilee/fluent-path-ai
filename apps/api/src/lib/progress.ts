import { Db, q, one, pool } from './db';
import { Correction } from './evaluate';
import { firstReview } from './srs';
import { localDate } from './learner';

export type Skill = 'read' | 'write' | 'speak' | 'lesson' | 'vocabulary' | 'technical' | 'pronunciation';

export async function recordScore(db: Db, userId: string, skill: Skill, score: number, sourceKind: string, sourceId: string | null, evaluator: 'rules' | 'llm' | 'objective') {
  await q('INSERT INTO skill_scores(user_id, skill, score, source_kind, source_id, evaluator) VALUES ($1,$2,$3,$4,$5,$6)',
    [userId, skill, Math.round(score * 100) / 100, sourceKind, sourceId, evaluator], db);
}

/** Store important mistakes and schedule them for spaced revision. */
export async function recordMistakes(db: Db, userId: string, skill: string, corrections: Correction[]) {
  for (const c of corrections) {
    if (['capitalization', 'punctuation'].includes(c.category)) continue;
    if (!c.original || c.original === c.corrected) continue;
    const row = await one<{ id: string }>(
      `INSERT INTO mistake_records(user_id, skill, category, original, corrected, explanation)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, original, corrected) DO UPDATE SET occurrences = mistake_records.occurrences + 1, last_seen_at = now(), resolved_at = NULL
       RETURNING id`, [userId, skill, c.category, c.original.slice(0, 500), c.corrected.slice(0, 500), c.explanation.slice(0, 1000)], db);
    if (row) await schedule(db, userId, 'mistake', row.id, true);
  }
}

export async function schedule(db: Db, userId: string, itemType: 'vocabulary' | 'phrase' | 'mistake' | 'grammar', itemId: string, resetIfExists = false) {
  const r = firstReview();
  await q(
    `INSERT INTO revision_schedules(user_id, item_type, item_id, stage, due_at) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id, item_type, item_id) DO ${resetIfExists ? 'UPDATE SET stage = 0, due_at = EXCLUDED.due_at' : 'NOTHING'}`,
    [userId, itemType, itemId, r.stage, r.dueAt], db);
}

export async function touchStreak(db: Db, userId: string, tz: string) {
  const today = localDate(tz);
  const s = await one<{ current: number; longest: number; last_active_date: string | null }>(
    `SELECT current, longest, to_char(last_active_date,'YYYY-MM-DD') AS last_active_date FROM learning_streaks WHERE user_id=$1`, [userId], db);
  if (!s) {
    await q('INSERT INTO learning_streaks(user_id, current, longest, last_active_date) VALUES ($1,1,1,$2) ON CONFLICT DO NOTHING', [userId, today], db);
    return 1;
  }
  if (s.last_active_date === today) return s.current;
  const yesterday = new Date(new Date(today + 'T00:00:00Z').getTime() - 86400_000).toISOString().slice(0, 10);
  const current = s.last_active_date === yesterday ? s.current + 1 : 1;
  await q('UPDATE learning_streaks SET current=$2, longest=GREATEST(longest,$2), last_active_date=$3 WHERE user_id=$1', [userId, current, today], db);
  return current;
}

export async function award(db: Db, userId: string, code: string): Promise<boolean> {
  const r = await q('INSERT INTO user_achievements(user_id, achievement_code) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING achievement_code', [userId, code], db);
  return r.length > 0;
}

export async function checkAchievements(db: Db, userId: string): Promise<string[]> {
  const earned: string[] = [];
  const stats = await one<any>(`SELECT
      (SELECT current FROM learning_streaks WHERE user_id=$1) AS streak,
      (SELECT count(*) FROM learning_days WHERE user_id=$1 AND status='completed')::int AS days,
      (SELECT count(*) FROM vocabulary_progress WHERE user_id=$1)::int AS words,
      (SELECT count(*) FROM exam_attempts WHERE user_id=$1 AND submitted_at IS NOT NULL AND exam_type<>'mini')::int AS exams,
      (SELECT coalesce(max(percent),0) FROM exam_attempts WHERE user_id=$1 AND exam_type<>'mini')::float AS best_exam,
      (SELECT count(*) FROM skill_scores WHERE user_id=$1 AND skill='write')::int AS writes,
      (SELECT count(*) FROM skill_scores WHERE user_id=$1 AND skill='speak')::int AS speaks`, [userId], db);
  const rules: Array<[string, boolean]> = [
    ['first-day', stats.days >= 1], ['streak-3', (stats.streak ?? 0) >= 3], ['streak-7', (stats.streak ?? 0) >= 7],
    ['words-50', stats.words >= 50], ['first-exam', stats.exams >= 1], ['exam-75', stats.best_exam >= 75],
    ['writer', stats.writes >= 1], ['speaker', stats.speaks >= 1],
  ];
  for (const [code, ok] of rules) if (ok && (await award(db, userId, code))) earned.push(code);
  return earned;
}

export async function addTime(db: Db, learningDayId: string | null, seconds: number) {
  if (!learningDayId) return;
  const s = Math.max(0, Math.min(1800, Math.round(seconds || 0)));
  await q('UPDATE learning_days SET seconds_spent = seconds_spent + $2 WHERE id=$1', [learningDayId, s], db);
}

export { pool };
