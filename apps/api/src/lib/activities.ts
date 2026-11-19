import { z } from 'zod';
import { one, q, tx } from './db';
import { ApiError, notFound } from './errors';
import { learnerCtx, getProfile } from './learner';
import { isCorrect, Correction } from './evaluate';
import { evaluateOpen } from './agent';
import { scorePractice, scoreReading, scoreWriting, scoreTurn, ItemResult } from './content';
import { recordScore, recordMistakes, schedule, touchStreak, checkAchievements, addTime, Skill } from './progress';
import { nextReview } from './srs';

export const SubmitZ = z.object({
  answers: z.any(),
  elapsedSeconds: z.number().min(0).max(7200).optional(),
});

export async function loadActivity(userId: string, id: string) {
  const a = await one<any>('SELECT * FROM learning_activities WHERE id=$1 AND user_id=$2', [id, userId]);
  if (!a) throw notFound('Activity');
  return a;
}

const strArr = (v: unknown, n = 50) => (Array.isArray(v) ? v.slice(0, n).map(x => (typeof x === 'string' ? x.slice(0, 2000) : '')) : []);

/** One conversational turn for speaking / technical activities. Stores state so the learner can pause and resume. */
export async function activityTurn(userId: string, id: string, index: number, transcript: string, inputMode: 'text' | 'voice') {
  const a = await loadActivity(userId, id);
  if (!['speaking', 'technical'].includes(a.kind)) throw new ApiError(400, 'VALIDATION_ERROR', 'This activity has no conversation turns.');
  const qs = a.answer_key.questions as any[];
  if (index < 0 || index >= qs.length) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid question index.');
  const ctx = await learnerCtx(userId);
  const ev = await scoreTurn(a.kind, qs[index], transcript, ctx);
  const turns = { ...(a.state.turns ?? {}), [index]: { transcript, inputMode, evaluation: ev } };
  await q(`UPDATE learning_activities SET state = state || $2::jsonb, status = CASE WHEN status='pending' THEN 'in_progress' ELSE status END WHERE id=$1`,
    [id, JSON.stringify({ turns, index: index + 1 })]);
  return { evaluation: ev, inputMode, pronunciationAssessed: false, next: index + 1 < qs.length ? { index: index + 1, ...publicQ(qs[index + 1]) } : null };
}
const publicQ = (x: any) => ({ prompt: x.prompt, prompt_ta: x.prompt_ta ?? null, pattern: x.pattern });

export async function submitActivity(userId: string, id: string, answers: any, elapsedSeconds = 0) {
  const a = await loadActivity(userId, id);
  if (a.status === 'done') return { alreadyCompleted: true, result: a.result, score: a.score };
  const ctx = await learnerCtx(userId);
  const key = a.answer_key;
  let score = 0;
  let skill: Skill = 'lesson';
  let result: any = {};
  let corrections: Correction[] = [];
  let evaluator: 'objective' | 'rules' | 'llm' = 'objective';
  const after: Array<(c: any) => Promise<void>> = [];

  switch (a.kind) {
    case 'vocabulary': {
      skill = 'vocabulary';
      const quiz = strArr(answers?.quiz);
      const items: ItemResult[] = (key.quiz as string[]).map((ans, i) => ({ prompt: a.content.quiz[i].prompt, yourAnswer: quiz[i] ?? '', correct: isCorrect(quiz[i] ?? '', [ans]), expected: ans, explanation: '' }));
      const sentences = strArr(answers?.sentences);
      const sentenceEvals = [];
      for (let i = 0; i < key.sentenceWords.length; i++) {
        const ev = await evaluateOpen('vocabulary', { prompt: `Make a sentence with "${key.sentenceWords[i]}"`, answer: sentences[i] ?? '', keywords: [key.sentenceWords[i]] }, ctx);
        sentenceEvals.push({ word: key.sentenceWords[i], text: sentences[i] ?? '', evaluation: ev });
        corrections.push(...ev.corrections);
        if (ev.evaluator === 'llm') evaluator = 'llm'; else if (evaluator !== 'llm') evaluator = 'rules';
      }
      const quizScore = items.length ? (items.filter(i => i.correct).length / items.length) * 100 : 100;
      const sentScore = sentenceEvals.length ? sentenceEvals.reduce((s, e) => s + e.evaluation.score, 0) / sentenceEvals.length : 100;
      score = Math.round(quizScore * 0.6 + sentScore * 0.4);
      result = { items, sentences: sentenceEvals };
      const wrongWords = new Set(items.filter(i => !i.correct).map(i => i.expected));
      after.push(async c => {
        for (const wid of key.wordIds as string[]) {
          const w = a.content.words.find((x: any) => x.id === wid);
          const wrong = w && wrongWords.has(w.word);
          await q(`INSERT INTO vocabulary_progress(user_id, vocabulary_id, correct_count, wrong_count) VALUES ($1,$2,$3,$4)
                   ON CONFLICT (user_id, vocabulary_id) DO UPDATE SET correct_count = vocabulary_progress.correct_count + $3, wrong_count = vocabulary_progress.wrong_count + $4, last_seen_at = now()`,
            [userId, wid, wrong ? 0 : 1, wrong ? 1 : 0], c);
          await schedule(c, userId, 'vocabulary', wid);
        }
      });
      break;
    }
    case 'phrases':
    case 'phrasal_verbs': {
      skill = 'vocabulary';
      const ans = strArr(answers);
      const items = [];
      for (let i = 0; i < a.content.items.length; i++) {
        const p = a.content.items[i];
        const keywords = a.kind === 'phrasal_verbs' ? p.text.split(' ').slice(-1) : [];
        const ev = await evaluateOpen('vocabulary', { prompt: p.practice_question, answer: ans[i] ?? '', keywords, sample: p.example }, ctx);
        if (ev.evaluator === 'llm') evaluator = 'llm'; else if (evaluator !== 'llm') evaluator = 'rules';
        corrections.push(...ev.corrections);
        items.push({ phrase: p.text, prompt: p.practice_question, yourAnswer: ans[i] ?? '', evaluation: ev });
      }
      score = Math.round(items.reduce((s, x) => s + x.evaluation.score, 0) / Math.max(1, items.length));
      result = { items };
      after.push(async c => {
        for (const pid of key.ids as string[]) {
          await q('INSERT INTO phrase_progress(user_id, phrase_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, pid], c);
          await schedule(c, userId, 'phrase', pid);
        }
      });
      break;
    }
    case 'grammar': {
      skill = 'lesson';
      const r = await scorePractice(key.practice, strArr(answers), ctx);
      score = r.score; result = r; corrections = r.corrections; evaluator = r.evaluator;
      after.push(c => saveContentProgress(c, userId, 'grammar', key.lessonId, score));
      break;
    }
    case 'reading': {
      skill = 'read';
      const r = scoreReading(key.questions, strArr(answers));
      score = r.score; result = r;
      after.push(c => saveContentProgress(c, userId, 'reading', key.contentId, score));
      break;
    }
    case 'writing': {
      skill = 'write';
      const text = typeof answers?.text === 'string' ? answers.text.slice(0, 5000) : '';
      if (!text.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'Please write your answer before submitting.');
      const w = await one<any>('SELECT * FROM writing_exercises WHERE id=$1', [key.contentId]);
      const ev = await scoreWriting(w, text, ctx);
      score = ev.score; result = { text, evaluation: ev }; corrections = ev.corrections; evaluator = ev.evaluator;
      after.push(c => saveContentProgress(c, userId, 'writing', key.contentId, score));
      break;
    }
    case 'speaking':
    case 'technical': {
      skill = a.kind === 'speaking' ? 'speak' : 'technical';
      const turns = a.state.turns ?? {};
      const qs = key.questions as any[];
      // Evaluate any unanswered turns sent in the submission (e.g. offline-composed answers).
      const extra = strArr(answers);
      for (let i = 0; i < qs.length; i++) {
        if (!turns[i] && extra[i]) turns[i] = { transcript: extra[i], inputMode: 'text', evaluation: await scoreTurn(a.kind, qs[i], extra[i], ctx) };
      }
      const done = Object.values(turns) as any[];
      if (!done.length) throw new ApiError(400, 'VALIDATION_ERROR', 'Please answer at least one question.');
      score = Math.round(qs.reduce((s, _q, i) => s + (turns[i]?.evaluation.score ?? 0), 0) / qs.length);
      for (const t of done) { corrections.push(...t.evaluation.corrections); if (t.evaluation.evaluator === 'llm') evaluator = 'llm'; else if (evaluator !== 'llm') evaluator = 'rules'; }
      result = { turns, pronunciationAssessed: false, note: 'Fluency and grammar were assessed from your words. Pronunciation is not scored here.' };
      if (key.contentId) after.push(c => saveContentProgress(c, userId, a.kind, key.contentId, score));
      break;
    }
    case 'revision': {
      skill = 'vocabulary';
      const ans = strArr(answers);
      const items = (key.items as any[]).map((it, i) => ({ ...it, yourAnswer: ans[i] ?? '', correct: isCorrect(ans[i] ?? '', [it.answer]) }));
      score = items.length ? Math.round((items.filter(i => i.correct).length / items.length) * 100) : 100;
      result = { items: items.map(i => ({ prompt: i.prompt, yourAnswer: i.yourAnswer, correct: i.correct, expected: i.answer, explanation: i.hint ?? '' })) };
      after.push(async c => { for (const it of items) if (it.revisionId) await reviewItem(c, userId, it.revisionId, it.correct); });
      break;
    }
    case 'mini_exam': {
      skill = 'lesson';
      const ans = strArr(answers);
      const items = (key.questions as any[]).map((qq, i) => ({ prompt: qq.prompt, yourAnswer: ans[i] ?? '', correct: isCorrect(ans[i] ?? '', [qq.answer]), expected: qq.answer, explanation: qq.explanation }));
      score = items.length ? Math.round((items.filter(i => i.correct).length / items.length) * 100) : 0;
      result = { items, passed: score >= 75 };
      break;
    }
    default:
      throw new ApiError(400, 'VALIDATION_ERROR', 'Unknown activity type.');
  }

  const profile = await getProfile(userId);
  return tx(async c => {
    const upd = await q(`UPDATE learning_activities SET status='done', score=$2, result=$3, completed_at=now() WHERE id=$1 AND status <> 'done' RETURNING id`, [id, score, JSON.stringify({ ...result, evaluator })], c);
    if (!upd.length) return { alreadyCompleted: true, score, result };
    for (const f of after) await f(c);
    await recordScore(c, userId, skill, score, `activity:${a.kind}`, id, evaluator);
    await recordMistakes(c, userId, skill, corrections);
    await addTime(c, a.learning_day_id, elapsedSeconds || a.minutes * 60);
    const streak = await touchStreak(c, userId, profile.timezone);
    const remaining = await one<{ n: number }>(`SELECT count(*)::int AS n FROM learning_activities WHERE learning_day_id=$1 AND status <> 'done'`, [a.learning_day_id], c);
    let dayCompleted = false;
    if (remaining!.n === 0) {
      await q(`UPDATE learning_days SET status='completed', completed_at=now() WHERE id=$1 AND status <> 'completed'`, [a.learning_day_id], c);
      dayCompleted = true;
    }
    const achievements = await checkAchievements(c, userId);
    return { score, result: { ...result, evaluator }, evaluator, streak, dayCompleted, achievements };
  });
}

export async function saveContentProgress(c: any, userId: string, type: string, contentId: string, score: number) {
  if (!contentId) return;
  await q(`INSERT INTO content_progress(user_id, content_type, content_id, best_score, attempts) VALUES ($1,$2,$3,$4,1)
           ON CONFLICT (user_id, content_type, content_id) DO UPDATE SET best_score = GREATEST(content_progress.best_score, EXCLUDED.best_score), attempts = content_progress.attempts + 1, last_attempt_at = now()`,
    [userId, type, contentId, score], c);
}

export async function reviewItem(c: any, userId: string, revisionId: string, correct: boolean) {
  const r = await one<any>('SELECT * FROM revision_schedules WHERE id=$1 AND user_id=$2', [revisionId, userId], c);
  if (!r) return null;
  const n = nextReview(r.stage, correct);
  await q('UPDATE revision_schedules SET stage=$2, due_at=$3, last_result=$4, review_count=review_count+1 WHERE id=$1', [revisionId, n.stage, n.dueAt, correct ? 'correct' : 'wrong'], c);
  if (r.item_type === 'mistake' && n.stage >= 5) await q('UPDATE mistake_records SET resolved_at=now() WHERE id=$1', [r.item_id], c);
  if (r.item_type === 'vocabulary' && n.stage >= 5) await q(`UPDATE vocabulary_progress SET status='mastered' WHERE user_id=$1 AND vocabulary_id=$2`, [userId, r.item_id], c);
  return n;
}
