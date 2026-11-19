import { z } from 'zod';
import { route, body, parseId, cleanText } from '@/lib/http';
import { one, q, tx } from '@/lib/db';
import { notFound } from '@/lib/errors';
import { isCorrect } from '@/lib/evaluate';
import { evaluateOpen } from '@/lib/agent';
import { learnerCtx } from '@/lib/learner';
import { schedule, recordMistakes } from '@/lib/progress';

// Practice steps: listen → repeat (client) → spell → meaning → create a sentence → answer a question
const Z = z.object({ task: z.enum(['spell', 'meaning', 'sentence']), answer: cleanText(500) });

export const POST = route<{ id: string }>({ limit: 'ai' }, async ({ req, userId, params }) => {
  const id = parseId(params.id);
  const b = await body(req, Z);
  const w = await one<any>('SELECT * FROM vocabulary WHERE id=$1', [id]);
  if (!w) throw notFound('Word');
  let correct = false; let evaluation = null;
  if (b.task === 'spell') correct = isCorrect(b.answer, [w.word]);
  else if (b.task === 'meaning') correct = isCorrect(b.answer, [w.meaning_en, w.word]);
  else {
    evaluation = await evaluateOpen('vocabulary', { prompt: `Make a sentence with "${w.word}"`, answer: b.answer, keywords: [w.word.split(' ')[0]] }, await learnerCtx(userId));
    correct = evaluation.score >= 70;
  }
  await tx(async c => {
    await q(`INSERT INTO vocabulary_progress(user_id, vocabulary_id, correct_count, wrong_count) VALUES ($1,$2,$3,$4)
             ON CONFLICT (user_id, vocabulary_id) DO UPDATE SET correct_count=vocabulary_progress.correct_count+$3, wrong_count=vocabulary_progress.wrong_count+$4, last_seen_at=now()`,
      [userId, id, correct ? 1 : 0, correct ? 0 : 1], c);
    await schedule(c, userId, 'vocabulary', id);
    if (evaluation) await recordMistakes(c, userId, 'vocabulary', evaluation.corrections);
  });
  return { correct, expected: b.task === 'spell' ? w.word : b.task === 'meaning' ? w.meaning_en : null, evaluation };
});
