import { one, q, Db, pool } from './db';
import { ApiError } from './errors';
import { LearnerCtx } from './agent';

export interface Profile {
  user_id: string; level_id: number; current_day: number; timezone: string; onboarded_at: Date | null;
  daily_minutes: number; native_language: string;
}

export async function getProfile(userId: string, db: Db = pool()): Promise<Profile> {
  const p = await one<Profile>('SELECT * FROM learner_profiles WHERE user_id=$1', [userId], db);
  if (!p) throw new ApiError(404, 'NOT_FOUND', 'Profile not found.');
  return p;
}

export async function requireOnboarded(userId: string) {
  const p = await getProfile(userId);
  if (!p.onboarded_at) throw new ApiError(409, 'ONBOARDING_REQUIRED', 'Please finish onboarding first.');
  return p;
}

/** Local calendar date (YYYY-MM-DD) for the learner's timezone. */
export function localDate(tz: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export const MISTAKE_TO_TOPIC: Record<string, string> = {
  'be-verb': 'is-am-are', 'have-has': 'has-have-had', agreement: 'simple-present', article: 'articles',
  modal: 'can-could-should-would', plural: 'singular-plural', 'word-order': 'subject-verb-object', introduction: 'is-am-are',
};

export async function weakAreas(userId: string, db: Db = pool()): Promise<string[]> {
  const rows = await q<{ category: string }>(
    `SELECT category FROM mistake_records WHERE user_id=$1 AND resolved_at IS NULL AND category NOT IN ('capitalization','punctuation')
     GROUP BY category ORDER BY sum(occurrences) DESC LIMIT 3`, [userId], db);
  return rows.map(r => r.category);
}

export async function learnerCtx(userId: string): Promise<LearnerCtx> {
  const [p, pref, weak] = await Promise.all([
    getProfile(userId),
    one<{ tamil_support: string }>('SELECT tamil_support FROM user_preferences WHERE user_id=$1', [userId]),
    weakAreas(userId),
  ]);
  return { level: p.level_id, tamilSupport: pref?.tamil_support ?? 'when_needed', weakAreas: weak };
}
