import { describe, it, expect } from 'vitest';
import { nextReview, firstReview, MASTERED } from '@/lib/srs';
import { pickQuestions, buildReport } from '@/lib/exams';
import { hit, resetLimits } from '@/lib/ratelimit';
import { buildMiniExam, shuffle } from '@/lib/plan';
import { splitSyllables } from '@/lib/pronunciation';

const H = 3600_000;
describe('spaced repetition', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  it('follows same day → 1 → 3 → 7 → 14 days → mastered', () => {
    expect(firstReview(now).dueAt.getTime() - now.getTime()).toBe(4 * H);
    const hours = [1, 2, 3, 4].map(stage => (nextReview(stage - 1, true, now).dueAt.getTime() - now.getTime()) / H);
    expect(hours).toEqual([24, 72, 168, 336]);
    expect(nextReview(4, true, now).stage).toBe(MASTERED);
  });
  it('resets to stage 0 on a wrong answer', () => {
    expect(nextReview(3, false, now)).toEqual({ stage: 0, dueAt: new Date(now.getTime() + 4 * H) });
  });
});

describe('exam engine', () => {
  const bank = Array.from({ length: 30 }, (_, i) => ({ id: String(i), skill: ['a', 'b', 'c'][i % 3], marks: i % 5 === 0 ? 20 : 10 }));
  it('picks exactly 100 marks covering every skill', () => {
    const picked = pickQuestions(bank);
    expect(picked.reduce((s, q) => s + q.marks, 0)).toBe(100);
    expect(new Set(picked.map(p => p.skill)).size).toBe(3);
    expect(new Set(picked.map(p => p.id)).size).toBe(picked.length);
  });
  it('randomizes question selection', () => {
    const sets = new Set(Array.from({ length: 10 }, () => pickQuestions(bank).map(q => q.id).sort().join(',')));
    expect(sets.size).toBeGreaterThan(1);
  });
  it('builds a report with 75% pass threshold, strengths and weaknesses', () => {
    const r = buildReport('lesson', [
      { skill: 'grammar', marks: 10, maxMarks: 10, correct: true },
      { skill: 'grammar', marks: 10, maxMarks: 10, correct: true },
      { skill: 'tenses', marks: 0, maxMarks: 10, correct: false },
      { skill: 'tenses', marks: 10, maxMarks: 10, correct: true },
    ], false);
    expect(r.totalScore).toBe(75);
    expect(r.passed).toBe(true);
    expect(r.strengths).toEqual(['grammar']);
    expect(r.weaknesses).toEqual(['tenses']);
    expect(r.incorrect).toHaveLength(1);
    expect(r.nextPlan.length).toBeGreaterThan(0);
  });
  it('states honestly that pronunciation was not measured in the speak exam', () => {
    const r = buildReport('speak', [{ skill: 'x', marks: 5, maxMarks: 20, correct: false, evaluation: {} }], false);
    expect(r.notes.join(' ')).toMatch(/Pronunciation was not measured/);
  });
});

describe('misc', () => {
  it('rate limiter blocks after the limit', () => {
    resetLimits();
    const results = Array.from({ length: 11 }, () => hit('1.2.3.4', 'auth', 1000).ok);
    expect(results.slice(0, 10).every(Boolean)).toBe(true);
    expect(results[10]).toBe(false);
  });
  it('mini exam never exposes answers in a way that differs from options', () => {
    const words = ['a', 'b', 'c', 'd'].map((w, i) => ({ id: String(i), word: w, meaning_en: `m${w}`, meaning_ta: `t${w}` }));
    const qs = buildMiniExam(words, [], [{ prompt: 'p', kind: 'mcq', options: ['x', 'y'], answer: ['x'], explanation: '' }]);
    expect(qs).toHaveLength(4);
    for (const q of qs) expect(q.options).toContain(q.answer);
  });
  it('shuffle keeps all elements', () => {
    expect(shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]);
  });
  it('splits syllables', () => {
    expect(splitSyllables('banana').join('')).toBe('banana');
    expect(splitSyllables('meeting').length).toBeGreaterThan(1);
  });
});

describe('configuration check', async () => {
  const { missingConfig, assertConfigured } = await import('@/lib/config');
  it('names missing settings and fails with 503 NOT_CONFIGURED', () => {
    const saved = { d: process.env.DATABASE_URL, p: process.env.POSTGRES_URL, j: process.env.JWT_SECRET };
    delete process.env.DATABASE_URL; delete process.env.POSTGRES_URL; process.env.JWT_SECRET = 'short';
    try {
      expect(missingConfig()).toEqual(['DATABASE_URL', 'JWT_SECRET (32+ characters)']);
      expect(() => assertConfigured()).toThrow(/missing: DATABASE_URL/);
      process.env.POSTGRES_URL = 'postgres://x';
      expect(missingConfig()).toEqual(['JWT_SECRET (32+ characters)']);
    } finally {
      process.env.DATABASE_URL = saved.d; if (saved.p === undefined) delete process.env.POSTGRES_URL; else process.env.POSTGRES_URL = saved.p; process.env.JWT_SECRET = saved.j;
    }
  });
});
