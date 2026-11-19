import { route, body } from '@/lib/http';
import { one } from '@/lib/db';
import { ProfileZ } from '@/lib/schemas';

export const PUT = route({}, async ({ req, userId }) => {
  const b = await body(req, ProfileZ.partial());
  const cols = Object.entries(b).filter(([, v]) => v !== undefined);
  if (!cols.length) return one('SELECT * FROM learner_profiles WHERE user_id=$1', [userId]);
  const map: Record<string, string> = { displayName: '', nativeLanguage: 'native_language', dailyMinutes: 'daily_minutes', learningMethod: 'learning_method', priority: 'priority', professionalBackground: 'professional_background', technicalSkills: 'technical_skills', careerObjective: 'career_objective', challenges: 'challenges', timezone: 'timezone' };
  const sets: string[] = []; const vals: unknown[] = [userId];
  for (const [k, v] of cols) {
    if (k === 'displayName') { await one('UPDATE users SET display_name=$2, updated_at=now() WHERE id=$1', [userId, v]); continue; }
    if (k === 'level') continue; // level changes only through assessments
    if (map[k]) { vals.push(v); sets.push(`${map[k]}=$${vals.length}`); }
  }
  if (sets.length) await one(`UPDATE learner_profiles SET ${sets.join(', ')}, updated_at=now() WHERE user_id=$1`, vals);
  return one('SELECT * FROM learner_profiles WHERE user_id=$1', [userId]);
});
