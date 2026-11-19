// Turn-based practice sessions (Speak / Technical hubs), persisted in agent_sessions.
import { one, q, tx } from './db';
import { ApiError } from './errors';
import { learnerCtx, getProfile } from './learner';
import { scoreTurn, TurnQ } from './content';
import { recordScore, recordMistakes, touchStreak, checkAchievements } from './progress';
import { saveContentProgress } from './activities';

export async function practiceTurn(userId: string, kind: 'speaking' | 'technical', contentId: string, questions: TurnQ[], index: number, transcript: string, inputMode: 'text' | 'voice') {
  if (index < 0 || index >= questions.length) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid question index.');
  const ctx = await learnerCtx(userId);
  const ev = await scoreTurn(kind, questions[index], transcript, ctx);
  const agent = `${kind}:${contentId}`;
  let s = await one<any>(`SELECT * FROM agent_sessions WHERE user_id=$1 AND agent=$2 AND status='active' ORDER BY created_at DESC LIMIT 1`, [userId, agent]);
  if (!s || index === 0) {
    if (s) await q(`UPDATE agent_sessions SET status='closed' WHERE id=$1`, [s.id]);
    s = await one<any>(`INSERT INTO agent_sessions(user_id, agent) VALUES ($1,$2) RETURNING *`, [userId, agent]);
  }
  const messages = [...(s.messages as any[]).filter(m => m.index !== index), { index, transcript, inputMode, score: ev.score, evaluator: ev.evaluator }];
  const last = index === questions.length - 1;
  let summary: any = null;
  await tx(async c => {
    await q(`UPDATE agent_sessions SET messages=$2, updated_at=now(), status=$3 WHERE id=$1`, [s.id, JSON.stringify(messages), last ? 'closed' : 'active'], c);
    await recordMistakes(c, userId, kind === 'speaking' ? 'speak' : 'technical', ev.corrections);
    if (last) {
      const score = Math.round(questions.reduce((sum, _q, i) => sum + (messages.find(m => m.index === i)?.score ?? 0), 0) / questions.length);
      const evaluator = messages.some(m => m.evaluator === 'llm') ? 'llm' : 'rules';
      await recordScore(c, userId, kind === 'speaking' ? 'speak' : 'technical', score, `practice:${kind}`, contentId, evaluator);
      await saveContentProgress(c, userId, kind, contentId, score);
      await touchStreak(c, userId, (await getProfile(userId, c)).timezone);
      const achievements = await checkAchievements(c, userId);
      summary = { score, answered: messages.length, total: questions.length, achievements };
    }
  });
  const nq = questions[index + 1];
  return { evaluation: ev, pronunciationAssessed: false, inputMode, next: nq ? { index: index + 1, prompt: nq.prompt, prompt_ta: nq.prompt_ta ?? null, pattern: nq.pattern } : null, summary };
}
