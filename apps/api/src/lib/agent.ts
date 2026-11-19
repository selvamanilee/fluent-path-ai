import { z } from 'zod';
import { Evaluation, OpenTask, rulesEvaluate } from './evaluate';

const CorrectionZ = z.object({
  original: z.string(), corrected: z.string(), explanation: z.string(),
  explanation_ta: z.string().optional().nullable().transform(v => v ?? undefined), category: z.string().default('grammar'),
});
const EvaluationZ = z.object({
  score: z.number().min(0).max(100),
  corrections: z.array(CorrectionZ).max(30),
  natural_version: z.string(),
  professional_version: z.string().optional().nullable().transform(v => v ?? undefined),
  feedback: z.string(),
  repeat_practice: z.string().optional().nullable().transform(v => v ?? undefined),
  criteria: z.record(z.string(), z.number()).optional().nullable().transform(v => v ?? undefined),
  evaluator: z.enum(['llm', 'unavailable']),
});

export type Skill = 'writing' | 'speaking' | 'technical' | 'grammar' | 'vocabulary' | 'reading' | 'assessment';
export interface LearnerCtx { level: number; tamilSupport: string; weakAreas: string[] }

async function post(path: string, payload: unknown): Promise<unknown | null> {
  const base = process.env.AGENT_URL;
  if (!base) return null;
  const timeout = Number(process.env.AGENT_TIMEOUT_MS ?? 20000);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.AGENT_SERVICE_TOKEN ?? ''}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeout),
      });
      if (res.ok) return await res.json();
      if (res.status < 500) return null; // don't retry client errors
    } catch (e) {
      if (attempt === 1) console.warn(JSON.stringify({ level: 'warn', msg: 'agent unavailable', path, err: String(e) }));
    }
  }
  return null;
}

/** Evaluate an open answer with the AI agent; falls back to the rule-based evaluator. Never throws. */
export async function evaluateOpen(skill: Skill, task: OpenTask, learner: LearnerCtx): Promise<Evaluation> {
  const raw = await post('/v1/evaluate', { skill, task: { prompt: task.prompt, keywords: task.keywords ?? [], min_sentences: task.minSentences ?? 1, sample: task.sample }, answer: task.answer, learner: { level: learner.level, tamil_support: learner.tamilSupport, weak_areas: learner.weakAreas } });
  const parsed = raw ? EvaluationZ.safeParse(raw) : null;
  if (parsed?.success && parsed.data.evaluator === 'llm') return { ...parsed.data, evaluator: 'llm' } as Evaluation;
  return rulesEvaluate(task);
}

export async function agentChat(agent: string, threadId: string, message: string, learner: LearnerCtx): Promise<{ reply: string; evaluator: 'llm' | 'unavailable' }> {
  const raw = (await post('/v1/chat', { agent, thread_id: threadId, message, learner: { level: learner.level, tamil_support: learner.tamilSupport, weak_areas: learner.weakAreas } })) as { reply?: string; evaluator?: string } | null;
  if (raw?.reply && raw.evaluator === 'llm') return { reply: raw.reply, evaluator: 'llm' };
  return { reply: '', evaluator: 'unavailable' };
}

export async function agentHealth(): Promise<{ reachable: boolean; provider?: string; model_ready?: boolean }> {
  const base = process.env.AGENT_URL;
  if (!base) return { reachable: false };
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) });
    const j = await res.json();
    return { reachable: res.ok, provider: j.provider, model_ready: j.model_ready };
  } catch {
    return { reachable: false };
  }
}
