import { z } from 'zod';
import { route, body, cleanText } from '@/lib/http';
import { one, q } from '@/lib/db';
import { agentChat } from '@/lib/agent';
import { learnerCtx } from '@/lib/learner';
import { rulesEvaluate } from '@/lib/evaluate';

// Free conversation with the AI tutor. Without a model, the tutor still corrects the learner's sentence
// with the rule-based checker and says clearly that the AI tutor is offline.
const Z = z.object({ agent: z.enum(['speaking', 'writing', 'tutor']).default('tutor'), message: cleanText(2000).pipe(z.string().min(1)), sessionId: z.string().uuid().optional() });

export const POST = route({ limit: 'ai' }, async ({ req, userId }) => {
  const b = await body(req, Z);
  let s = b.sessionId ? await one<any>('SELECT * FROM agent_sessions WHERE id=$1 AND user_id=$2', [b.sessionId, userId]) : null;
  if (!s) s = await one<any>(`INSERT INTO agent_sessions(user_id, agent) VALUES ($1,$2) RETURNING *`, [userId, `chat:${b.agent}`]);
  const ctx = await learnerCtx(userId);
  const ai = await agentChat(b.agent, s.id, b.message, ctx);
  const correction = rulesEvaluate({ prompt: 'chat', answer: b.message });
  const reply = ai.evaluator === 'llm' ? ai.reply
    : correction.corrections.length
      ? `Good try! A more correct way to say it: “${correction.natural_version}”. (The AI tutor is offline right now, so I can only check basic grammar.)`
      : 'Your sentence looks correct. (The AI tutor is offline right now, so free conversation is limited — try the Speak module for guided practice.)';
  const messages = [...s.messages, { role: 'user', text: b.message, at: new Date().toISOString() }, { role: 'tutor', text: reply, evaluator: ai.evaluator === 'llm' ? 'llm' : 'rules', at: new Date().toISOString() }].slice(-40);
  await q('UPDATE agent_sessions SET messages=$2, updated_at=now() WHERE id=$1', [s.id, JSON.stringify(messages)]);
  return { sessionId: s.id, reply, evaluator: ai.evaluator === 'llm' ? 'llm' : 'rules', corrections: ai.evaluator === 'llm' ? [] : correction.corrections };
});
