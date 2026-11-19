import { route, parseId } from '@/lib/http';
import { one } from '@/lib/db';
import { notFound } from '@/lib/errors';
import { publicReading } from '@/lib/content';
export const GET = route<{ id: string }>({}, async ({ params }) => {
  const r = await one('SELECT * FROM reading_passages WHERE id=$1', [parseId(params.id)]);
  if (!r) throw notFound('Passage');
  return publicReading(r);
});
