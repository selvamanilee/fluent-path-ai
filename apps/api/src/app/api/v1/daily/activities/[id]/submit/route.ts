import { route, body, parseId } from '@/lib/http';
import { submitActivity, SubmitZ } from '@/lib/activities';

export const POST = route<{ id: string }>({ limit: 'ai' }, async ({ req, userId, params }) => {
  const b = await body(req, SubmitZ);
  return submitActivity(userId, parseId(params.id), b.answers, b.elapsedSeconds);
});
