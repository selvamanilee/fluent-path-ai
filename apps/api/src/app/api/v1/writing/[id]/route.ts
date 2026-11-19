import { route, parseId } from '@/lib/http';
import { one } from '@/lib/db';
import { notFound } from '@/lib/errors';
import { publicWriting } from '@/lib/content';
// The reference answer is never returned here — only after the learner submits.
export const GET = route<{ id: string }>({}, async ({ params }) => {
  const w = await one('SELECT * FROM writing_exercises WHERE id=$1', [parseId(params.id)]);
  if (!w) throw notFound('Exercise');
  return publicWriting(w);
});
