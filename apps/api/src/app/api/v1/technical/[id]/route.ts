import { route, parseId } from '@/lib/http';
import { one } from '@/lib/db';
import { ApiError, notFound } from '@/lib/errors';
import { publicTurns } from '@/lib/content';
import { getProfile } from '@/lib/learner';
export const GET = route<{ id: string }>({}, async ({ params, userId }) => {
  const t = await one<any>('SELECT * FROM technical_scenarios WHERE id=$1', [parseId(params.id)]);
  if (!t) throw notFound('Exercise');
  const p = await getProfile(userId);
  if (t.level_id > p.level_id) throw new ApiError(403, 'LOCKED', `This unlocks at Level ${t.level_id}. Keep practising — you will get there!`);
  const { questions, ...rest } = t;
  return { ...rest, title: t.title, questions: publicTurns(questions) };
});
