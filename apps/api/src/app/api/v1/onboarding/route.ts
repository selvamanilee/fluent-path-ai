import { route, body } from '@/lib/http';
import { tx, one, q } from '@/lib/db';
import { OnboardingZ } from '@/lib/schemas';
import { getProfile } from '@/lib/learner';
import { getOrCreateToday } from '@/lib/plan';

export const POST = route({}, async ({ req, userId }) => {
  const b = await body(req, OnboardingZ);
  return tx(async c => {
    await q('UPDATE users SET display_name=$2 WHERE id=$1', [userId, b.displayName], c);
    await q(`UPDATE learner_profiles SET native_language=$2, daily_minutes=$3, learning_method=$4, priority=$5, professional_background=$6,
             technical_skills=$7, career_objective=$8, challenges=$9, timezone=$10, level_id=$11, onboarded_at=coalesce(onboarded_at, now()), updated_at=now() WHERE user_id=$1`,
      [userId, b.nativeLanguage, b.dailyMinutes, b.learningMethod, b.priority, b.professionalBackground, b.technicalSkills, b.careerObjective, b.challenges, b.timezone, b.startLevel], c);
    await q('UPDATE user_preferences SET tamil_support=$2 WHERE user_id=$1', [userId, b.tamilSupport], c);
    const profile = await getProfile(userId, c);
    const dayId = await getOrCreateToday(c, userId, profile);
    return { profile: await one('SELECT * FROM learner_profiles WHERE user_id=$1', [userId], c), learningDayId: dayId };
  });
});
