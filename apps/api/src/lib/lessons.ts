import { one, q } from './db';
import { ApiError, notFound } from './errors';
import { getProfile } from './learner';

// Returns a lesson; generates one with the AI agent (stored as source='ai') when no seed lesson exists.
export async function getLesson(slug: string, userId: string) {
  const sql = `SELECT gt.id AS topic_id, gt.slug, gt.title, gt.stage, l.* FROM grammar_topics gt LEFT JOIN lessons l ON l.grammar_topic_id=gt.id WHERE gt.slug=$1`;
  const l = await one<any>(sql, [slug.slice(0, 64)]);
  if (!l) throw notFound('Lesson');
  if (l.explanation) return l;
  const p = await getProfile(userId);
  const gen = await generateLesson(l.title, l.stage, p.level_id);
  if (!gen) throw new ApiError(503, 'CONTENT_UNAVAILABLE', 'This lesson is not available offline yet. It will be generated when the AI tutor is connected.');
  await q(`INSERT INTO lessons(grammar_topic_id, explanation, explanation_ta, rule, basic_examples, professional_examples, practice, source, model)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'ai',$8) ON CONFLICT (grammar_topic_id) DO NOTHING`,
    [l.topic_id, gen.explanation, gen.explanation_ta, gen.rule, JSON.stringify(gen.basic_examples), JSON.stringify(gen.professional_examples), JSON.stringify(gen.practice), gen.model]);
  return one<any>(sql, [slug]);
}

async function generateLesson(title: string, stage: number, level: number): Promise<any | null> {
  if (!process.env.AGENT_URL) return null;
  try {
    const res = await fetch(`${process.env.AGENT_URL}/v1/generate`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.AGENT_SERVICE_TOKEN ?? ''}` },
      body: JSON.stringify({ kind: 'lesson', topic: title, stage, level }), signal: AbortSignal.timeout(Number(process.env.AGENT_TIMEOUT_MS ?? 20000) * 3),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const ok = j && typeof j.explanation === 'string' && Array.isArray(j.basic_examples) && j.basic_examples.length >= 5 && Array.isArray(j.practice) && j.practice.length >= 3
      && j.practice.every((p: any) => typeof p.prompt === 'string' && ['mcq', 'fill', 'free'].includes(p.kind) && Array.isArray(p.answer));
    return ok ? j : null;
  } catch {
    return null;
  }
}
