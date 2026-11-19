import { z } from 'zod';
import { route, body, parseId, cleanText } from '@/lib/http';
import { activityTurn } from '@/lib/activities';

const Z = z.object({ index: z.number().int().min(0).max(50), transcript: cleanText(2000).pipe(z.string().min(1, 'Please answer before continuing.')), inputMode: z.enum(['text', 'voice']).default('text') });

export const POST = route<{ id: string }>({ limit: 'ai' }, async ({ req, userId, params }) => {
  const b = await body(req, Z);
  return activityTurn(userId, parseId(params.id), b.index, b.transcript, b.inputMode);
});
