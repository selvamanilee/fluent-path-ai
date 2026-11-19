import { one, q, tx } from './db';
import { ApiError, notFound } from './errors';
import { getProfile, learnerCtx } from './learner';
import { isCorrect, Correction } from './evaluate';
import { evaluateOpen } from './agent';
import { shuffle } from './plan';
import { recordScore, recordMistakes, checkAchievements, Skill } from './progress';

export type ExamType = 'read' | 'write' | 'speak' | 'lesson';
export const PASS = 75;
const MODULE_FOR: Record<ExamType, string> = { read: '/read', write: '/write', speak: '/speak', lesson: '/lesson' };
const SKILL_FOR: Record<ExamType, Skill> = { read: 'read', write: 'write', speak: 'speak', lesson: 'lesson' };

/** Pick a randomized set of questions totalling up to 100 marks, spread across skills and difficulties. */
export function pickQuestions<T extends { marks: number; skill: string }>(bank: T[], target = 100, rnd = Math.random): T[] {
  const bySkill = new Map<string, T[]>();
  for (const qq of shuffle(bank, rnd)) bySkill.set(qq.skill, [...(bySkill.get(qq.skill) ?? []), qq]);
  const picked: T[] = [];
  let total = 0;
  // Round-robin across skills so every skill area is represented.
  while (total < target) {
    let added = false;
    for (const list of bySkill.values()) {
      const next = list.find(x => total + x.marks <= target && !picked.includes(x));
      if (next) { picked.push(next); total += next.marks; added = true; }
      if (total >= target) break;
    }
    if (!added) break;
  }
  return picked;
}

export async function startExam(userId: string, examType: ExamType) {
  const p = await getProfile(userId);
  const bank = await q<any>('SELECT id, skill, marks, difficulty FROM exam_questions WHERE exam_type=$1 AND level_id <= $2', [examType, p.level_id]);
  if (!bank.length) throw new ApiError(404, 'NOT_FOUND', 'No questions available for this exam yet.');
  const picked = pickQuestions(bank).sort((a, b) => a.difficulty - b.difficulty);
  const row = await one<{ id: string }>('INSERT INTO exam_attempts(user_id, exam_type, level_id, question_ids) VALUES ($1,$2,$3,$4) RETURNING id', [userId, examType, p.level_id, picked.map(x => x.id)]);
  return getAttempt(userId, row!.id);
}

export async function getAttempt(userId: string, attemptId: string) {
  const a = await one<any>('SELECT * FROM exam_attempts WHERE id=$1 AND user_id=$2', [attemptId, userId]);
  if (!a) throw notFound('Exam');
  const qs = await q<any>('SELECT id, skill, kind, prompt, context, options, marks, difficulty FROM exam_questions WHERE id = ANY($1)', [a.question_ids]);
  const order = new Map<string, number>(a.question_ids.map((id: string, i: number) => [id, i]));
  qs.sort((x, y) => order.get(x.id)! - order.get(y.id)!);
  return {
    id: a.id, examType: a.exam_type, levelId: a.level_id, startedAt: a.started_at, submittedAt: a.submitted_at,
    questions: qs, report: a.report,
    note: a.exam_type === 'speak' ? 'Answers can be typed or spoken (voice is converted to text). Pronunciation is only scored when an audio assessment service is configured.' : undefined,
  };
}

export async function submitExam(userId: string, attemptId: string, answers: Record<string, string>) {
  const a = await one<any>('SELECT * FROM exam_attempts WHERE id=$1 AND user_id=$2', [attemptId, userId]);
  if (!a) throw notFound('Exam');
  if (a.submitted_at) throw new ApiError(409, 'CONFLICT', 'This exam was already submitted.');
  const examType = a.exam_type as ExamType;
  const qs = await q<any>('SELECT * FROM exam_questions WHERE id = ANY($1)', [a.question_ids]);
  const ctx = await learnerCtx(userId);

  const results: any[] = [];
  const corrections: Correction[] = [];
  let usedLlm = false;
  for (const qq of qs) {
    const ans = (answers?.[qq.id] ?? '').toString().slice(0, 3000);
    if (qq.kind === 'free') {
      const ev = await evaluateOpen(examType === 'speak' ? 'speaking' : 'assessment', { prompt: qq.prompt, answer: ans, keywords: qq.answer ?? [], minSentences: qq.marks >= 20 ? 2 : 1, sample: qq.explanation.replace(/^Example:\s*/, '') }, ctx);
      if (ev.evaluator === 'llm') usedLlm = true;
      corrections.push(...ev.corrections);
      const marks = Math.round((ev.score / 100) * qq.marks * 10) / 10;
      results.push({ questionId: qq.id, skill: qq.skill, prompt: qq.prompt, yourAnswer: ans, correct: ev.score >= 70, marks, maxMarks: qq.marks, explanation: qq.explanation, evaluation: ev });
    } else {
      const ok = isCorrect(ans, qq.answer);
      results.push({ questionId: qq.id, skill: qq.skill, prompt: qq.prompt, yourAnswer: ans, correct: ok, marks: ok ? qq.marks : 0, maxMarks: qq.marks, expected: qq.answer[0], explanation: qq.explanation });
    }
  }
  const report = buildReport(examType, results, usedLlm);

  const out = await tx(async c => {
    for (const r of results) {
      await q('INSERT INTO exam_answers(attempt_id, question_id, answer, is_correct, marks_awarded, feedback) VALUES ($1,$2,$3,$4,$5,$6)',
        [attemptId, r.questionId, r.yourAnswer, r.correct, r.marks, r.evaluation ? JSON.stringify(r.evaluation) : null], c);
    }
    const upd = await q(`UPDATE exam_attempts SET submitted_at=now(), total_score=$2, max_score=$3, percent=$4, report=$5 WHERE id=$1 AND submitted_at IS NULL RETURNING id`,
      [attemptId, report.rawScore, report.rawMax, report.totalScore, JSON.stringify(report)], c);
    if (!upd.length) throw new ApiError(409, 'CONFLICT', 'This exam was already submitted.');
    await recordScore(c, userId, SKILL_FOR[examType], report.totalScore, `exam:${examType}`, attemptId, usedLlm ? 'llm' : qs.some(x => x.kind === 'free') ? 'rules' : 'objective');
    await recordMistakes(c, userId, examType, corrections);
    const promotion = await evaluatePromotion(c, userId);
    const achievements = await checkAchievements(c, userId);
    const finalReport = { ...report, promotion, achievements };
    await q('UPDATE exam_attempts SET report=$2 WHERE id=$1', [attemptId, JSON.stringify(finalReport)], c);
    return finalReport;
  });
  return out;
}

export function buildReport(examType: ExamType, results: any[], usedLlm: boolean) {
  const rawScore = results.reduce((s, r) => s + r.marks, 0);
  const rawMax = results.reduce((s, r) => s + r.maxMarks, 0) || 1;
  const totalScore = Math.round((rawScore / rawMax) * 1000) / 10; // out of 100
  const skills: Record<string, { score: number; max: number; percent: number }> = {};
  for (const r of results) {
    const s = (skills[r.skill] ??= { score: 0, max: 0, percent: 0 });
    s.score += r.marks; s.max += r.maxMarks;
  }
  for (const s of Object.values(skills)) s.percent = Math.round((s.score / s.max) * 100);
  const strengths = Object.entries(skills).filter(([, s]) => s.percent >= PASS).map(([k]) => k);
  const weaknesses = Object.entries(skills).filter(([, s]) => s.percent < PASS).map(([k]) => k);
  const recommendations = weaknesses.length
    ? weaknesses.map(w => `Practise ${w.replace(/-/g, ' ')}: revisit the ${examType === 'lesson' ? 'Lesson' : examType[0].toUpperCase() + examType.slice(1)} module and redo the exercises you got wrong.`)
    : ['Excellent work. Keep your daily streak and try the next level’s content.'];
  const nextPlan = [
    ...(weaknesses.length ? [`Next 3 days: focus 10 extra minutes on ${weaknesses.slice(0, 2).join(' and ').replace(/-/g, ' ')}.`] : []),
    'Complete your daily learning session every day.',
    'Review your Revision queue — mistakes from this exam were added to it.',
    totalScore >= PASS ? 'Take the other module exams to show you are ready for the next level.' : `Retake this exam after 2–3 days of practice (target ${PASS}%).`,
  ];
  const notes: string[] = [];
  if (examType === 'speak') notes.push('Pronunciation was not measured: answers were assessed as text for fluency, grammar, vocabulary and sentence formation.');
  if (!usedLlm && results.some(r => r.evaluation)) notes.push('Open answers were checked by the rule-based evaluator (AI tutor not available).');
  return {
    examType, totalScore, rawScore, rawMax, passed: totalScore >= PASS, threshold: PASS, skills,
    correct: results.filter(r => r.correct), incorrect: results.filter(r => !r.correct),
    strengths, weaknesses, recommendations, nextPlan, module: MODULE_FOR[examType], notes,
    evaluator: usedLlm ? 'llm' : 'rules',
  };
}

/**
 * Evidence-based promotion: the learner moves up only when the latest attempt of ALL FOUR
 * module exams at the current level is ≥ 75%. A single good test never promotes on its own.
 */
export async function evaluatePromotion(c: any, userId: string) {
  const p = await getProfile(userId, c);
  const latest = await q<{ exam_type: string; percent: number }>(
    `SELECT DISTINCT ON (exam_type) exam_type, percent::float FROM exam_attempts
      WHERE user_id=$1 AND level_id=$2 AND submitted_at IS NOT NULL AND exam_type IN ('read','write','speak','lesson')
      ORDER BY exam_type, submitted_at DESC`, [userId, p.level_id], c);
  const status = Object.fromEntries((['read', 'write', 'speak', 'lesson'] as const).map(t => [t, latest.find(l => l.exam_type === t)?.percent ?? null]));
  const ready = Object.values(status).every(v => v !== null && v >= PASS);
  if (ready && p.level_id < 8) {
    await q('UPDATE learner_profiles SET level_id = level_id + 1 WHERE user_id=$1', [userId], c);
    return { promoted: true, newLevel: p.level_id + 1, status };
  }
  return { promoted: false, level: p.level_id, status, missing: Object.entries(status).filter(([, v]) => v === null || v < PASS).map(([k]) => k) };
}
