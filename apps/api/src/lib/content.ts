// Shaping content for learners (never leak answers) + shared evaluation of exercises.
import { evaluateOpen, LearnerCtx, Skill as AgentSkill } from './agent';
import { Correction, Evaluation, isCorrect } from './evaluate';

export interface PracticeItem { prompt: string; kind: 'mcq' | 'fill' | 'correct' | 'free'; options?: string[]; answer: string[]; explanation: string }
export const publicPractice = (items: PracticeItem[]) => items.map(({ prompt, kind, options }) => ({ prompt, kind, options: options ?? null }));

export interface ItemResult {
  prompt: string; yourAnswer: string; correct: boolean; expected: string | null; explanation: string; evaluation?: Evaluation;
}
export interface ScoredResult { score: number; items: ItemResult[]; corrections: Correction[]; evaluator: 'objective' | 'rules' | 'llm' }

/** Scores a mixed set of objective + open practice items. Score is 0..100. */
export async function scorePractice(items: PracticeItem[], answers: string[], ctx: LearnerCtx, skill: AgentSkill = 'grammar'): Promise<ScoredResult> {
  const results: ItemResult[] = [];
  const corrections: Correction[] = [];
  let total = 0;
  let usedLlm = false, usedRules = false;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const ans = (answers[i] ?? '').toString().slice(0, 2000);
    if (it.kind === 'free') {
      const ev = await evaluateOpen(skill, { prompt: it.prompt, answer: ans, keywords: it.answer }, ctx);
      ev.evaluator === 'llm' ? (usedLlm = true) : (usedRules = true);
      corrections.push(...ev.corrections);
      total += ev.score;
      results.push({ prompt: it.prompt, yourAnswer: ans, correct: ev.score >= 70, expected: null, explanation: it.explanation, evaluation: ev });
    } else {
      const ok = isCorrect(ans, it.answer);
      total += ok ? 100 : 0;
      if (!ok && ans && it.kind === 'correct') corrections.push({ original: ans, corrected: it.answer[0], explanation: it.explanation, category: 'grammar' });
      results.push({ prompt: it.prompt, yourAnswer: ans, correct: ok, expected: it.answer[0], explanation: it.explanation });
    }
  }
  return { score: items.length ? Math.round(total / items.length) : 0, items: results, corrections, evaluator: usedLlm ? 'llm' : usedRules ? 'rules' : 'objective' };
}

export interface ReadingQ { prompt: string; options: string[]; answer: string; explanation: string }
export const publicReading = (p: any) => ({
  id: p.id, title: p.title, body: p.body, level_id: p.level_id, source: p.source,
  difficult_words: p.difficult_words, sentence_meanings: p.sentence_meanings,
  questions: (p.questions as ReadingQ[]).map(q => ({ prompt: q.prompt, options: q.options })),
});

export function scoreReading(questions: ReadingQ[], answers: string[]): ScoredResult {
  const items = questions.map((q, i) => {
    const ans = answers[i] ?? '';
    const correct = isCorrect(ans, [q.answer]);
    return { prompt: q.prompt, yourAnswer: ans, correct, expected: q.answer, explanation: q.explanation };
  });
  const score = Math.round((items.filter(i => i.correct).length / Math.max(1, items.length)) * 100);
  return { score, items, corrections: [], evaluator: 'objective' };
}

export const publicWriting = (w: any) => ({ id: w.id, level_id: w.level_id, topic: w.topic, instructions: w.instructions, instructions_ta: w.instructions_ta, min_sentences: w.min_sentences, source: w.source });

export async function scoreWriting(w: any, text: string, ctx: LearnerCtx): Promise<Evaluation & { reference: string }> {
  const ev = await evaluateOpen('writing', { prompt: `${w.topic}: ${w.instructions}`, answer: text, keywords: w.keywords, minSentences: w.min_sentences, sample: w.reference_answer }, ctx);
  // The model answer is revealed only after the learner has attempted the exercise.
  return { ...ev, reference: w.reference_answer };
}

export interface TurnQ { prompt: string; prompt_ta?: string; pattern: string; sample: string }
export async function scoreTurn(skill: 'speaking' | 'technical', q: TurnQ, transcript: string, ctx: LearnerCtx): Promise<Evaluation> {
  const ev = await evaluateOpen(skill, { prompt: q.prompt, answer: transcript, minSentences: 1, sample: q.sample }, ctx);
  return { ...ev, professional_version: ev.professional_version ?? q.sample };
}

export const publicTurns = (qs: TurnQ[]) => qs.map(({ prompt, prompt_ta, pattern }) => ({ prompt, prompt_ta: prompt_ta ?? null, pattern }));
