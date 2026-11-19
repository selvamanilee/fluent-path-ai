import { z } from 'zod';
import { route, body, parseId } from '@/lib/http';
import { submitExam } from '@/lib/exams';
export const POST = route<{ id: string }>({ limit: 'ai' }, async ({ req, params, userId }) => {
  const b = await body(req, z.object({ answers: z.record(z.string().uuid(), z.string().max(3000)) }));
  return submitExam(userId, parseId(params.id), b.answers);
});
