import { z } from 'zod';
import { route, body } from '@/lib/http';
import { q } from '@/lib/db';
import { startExam } from '@/lib/exams';
import { requireOnboarded } from '@/lib/learner';

export const POST = route({}, async ({ req, userId }) => {
  await requireOnboarded(userId);
  const b = await body(req, z.object({ examType: z.enum(['read', 'write', 'speak', 'lesson']) }));
  return startExam(userId, b.examType);
});

export const GET = route({}, async ({ req, userId }) => {
  const t = req.nextUrl.searchParams.get('examType');
  return q(`SELECT id, exam_type, level_id, started_at, submitted_at, percent::float, (percent >= 75) AS passed
            FROM exam_attempts WHERE user_id=$1 AND exam_type <> 'mini' AND ($2::text IS NULL OR exam_type=$2) ORDER BY started_at DESC LIMIT 50`, [userId, t]);
});
