import { z } from 'zod';
import { route, body, parseId } from '@/lib/http';
import { q } from '@/lib/db';
import { notFound } from '@/lib/errors';

// Pause / resume: the client saves partial answers here.
export const PUT = route<{ id: string }>({}, async ({ req, userId, params }) => {
  const id = parseId(params.id);
  const b = await body(req, z.object({ state: z.record(z.string(), z.any()) }));
  if (JSON.stringify(b.state).length > 20000) throw notFound('Activity');
  const r = await q(`UPDATE learning_activities SET state = state || $3::jsonb, status = CASE WHEN status='pending' THEN 'in_progress' ELSE status END
                     WHERE id=$1 AND user_id=$2 RETURNING id, status`, [id, userId, JSON.stringify({ draft: b.state })]);
  if (!r.length) throw notFound('Activity');
  return r[0];
});
