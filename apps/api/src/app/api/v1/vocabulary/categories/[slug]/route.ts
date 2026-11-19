import { route } from '@/lib/http';
import { q, one } from '@/lib/db';
import { notFound } from '@/lib/errors';

export const GET = route<{ slug: string }>({}, async ({ req, userId, params }) => {
  const cat = await one<any>('SELECT id, slug, name, name_ta, icon FROM vocabulary_categories WHERE slug=$1', [params.slug.slice(0, 64)]);
  if (!cat) throw notFound('Category');
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? 50) || 50));
  const words = await q(`SELECT v.id, v.word, v.meaning_ta, v.meaning_en, v.pronunciation, v.ipa, v.part_of_speech, v.example, v.example_ta, v.synonym, v.antonym, v.source,
                           coalesce(vp.status, 'new') AS status
                         FROM vocabulary v LEFT JOIN vocabulary_progress vp ON vp.vocabulary_id=v.id AND vp.user_id=$2
                         WHERE v.category_id=$1 ORDER BY v.sort LIMIT $3 OFFSET $4`, [cat.id, userId, limit, (page - 1) * limit]);
  const total = await one<{ n: number }>('SELECT count(*)::int AS n FROM vocabulary WHERE category_id=$1', [cat.id]);
  return { category: cat, words, page, limit, total: total!.n };
});
