import { describe, it, expect, beforeAll } from 'vitest';
import { call } from './helpers';
import * as register from '@/app/api/v1/auth/register/route';
import * as login from '@/app/api/v1/auth/login/route';
import * as refresh from '@/app/api/v1/auth/refresh/route';
import * as logout from '@/app/api/v1/auth/logout/route';
import * as me from '@/app/api/v1/me/route';
import * as onboarding from '@/app/api/v1/onboarding/route';
import * as today from '@/app/api/v1/daily/today/route';
import * as submit from '@/app/api/v1/daily/activities/[id]/submit/route';
import * as turn from '@/app/api/v1/daily/activities/[id]/turn/route';
import * as state from '@/app/api/v1/daily/activities/[id]/state/route';
import * as dashboard from '@/app/api/v1/dashboard/route';
import * as exams from '@/app/api/v1/exams/route';
import * as examSubmit from '@/app/api/v1/exams/[id]/submit/route';
import * as progress from '@/app/api/v1/progress/route';
import * as revisionDue from '@/app/api/v1/revision/due/route';
import * as writing from '@/app/api/v1/writing/route';
import * as writingOne from '@/app/api/v1/writing/[id]/route';
import * as writingSubmit from '@/app/api/v1/writing/[id]/submit/route';
import * as lessons from '@/app/api/v1/lessons/route';
import * as lessonOne from '@/app/api/v1/lessons/[slug]/route';
import * as technical from '@/app/api/v1/technical/route';
import * as technicalOne from '@/app/api/v1/technical/[id]/route';
import * as pron from '@/app/api/v1/pronunciation/attempt/route';
import * as health from '@/app/api/v1/health/route';

const email = `ann${Date.now()}@example.com`;
let token = '';
let cookie = '';
const profile = { displayName: 'Ann', nativeLanguage: 'Tamil', dailyMinutes: 30, learningMethod: 'Interactive conversation', priority: 'Speaking and professional communication', professionalBackground: 'Technical Lead', technicalSkills: ['C#', 'Angular'], careerObjective: 'Solution Architect', challenges: ['grammar'], timezone: 'Asia/Kolkata', tamilSupport: 'when_needed' };

describe('learner journey', () => {
  beforeAll(async () => {
    const r = await call(register.POST, { method: 'POST', body: { email, password: 'secret-pass-1', displayName: 'Ann' } });
    expect(r.status).toBe(201);
    token = r.data.accessToken;
    cookie = r.setCookie!.split(';')[0];
    expect(r.setCookie).toMatch(/HttpOnly/);
  });

  it('rejects invalid registration and duplicate emails', async () => {
    expect((await call(register.POST, { method: 'POST', body: { email: 'bad', password: '1', displayName: '' } })).status).toBe(400);
    expect((await call(register.POST, { method: 'POST', body: { email, password: 'secret-pass-1', displayName: 'Ann' } })).status).toBe(409);
  });

  it('requires auth and onboarding', async () => {
    expect((await call(dashboard.GET)).status).toBe(401);
    expect((await call(dashboard.GET, { token })).error.code).toBe('ONBOARDING_REQUIRED');
  });

  it('onboards at Level 1 and creates Day 1 without technical English', async () => {
    const r = await call(onboarding.POST, { method: 'POST', token, body: profile });
    expect(r.status).toBe(200);
    expect(r.data.profile.level_id).toBe(1);
    const t = await call(today.GET, { token });
    expect(t.data.day.day_number).toBe(1);
    const kinds = t.data.activities.map((a: any) => a.kind);
    expect(kinds).toEqual(['vocabulary', 'phrases', 'phrasal_verbs', 'grammar', 'speaking', 'reading', 'writing', 'revision', 'mini_exam']);
    const vocab = t.data.activities[0];
    expect(vocab.content.words).toHaveLength(10);
    expect(vocab.content.words[0].word).toBe('hello');
    expect(t.data.activities[1].content.items).toHaveLength(5);
    expect(t.data.activities[2].content.items).toHaveLength(3);
    // answers are never sent to the client
    expect(JSON.stringify(t.data)).not.toContain('answer_key');
    expect(t.data.activities.find((a: any) => a.kind === 'writing').content.reference_answer).toBeUndefined();
    expect(t.data.activities.find((a: any) => a.kind === 'grammar').content.practice[0].answer).toBeUndefined();
  });

  it('delivers, evaluates and saves every activity; completes the day', async () => {
    const t = (await call(today.GET, { token })).data;
    const byKind = Object.fromEntries(t.activities.map((a: any) => [a.kind, a]));

    // pause / resume
    await call(state.PUT, { method: 'PUT', token, params: { id: byKind.writing.id }, body: { state: { text: 'draft' } } });
    const resumed = (await call(today.GET, { token })).data.activities.find((a: any) => a.kind === 'writing');
    expect(resumed.state.draft.text).toBe('draft');
    expect(resumed.status).toBe('in_progress');

    const v = byKind.vocabulary;
    const quiz = v.content.quiz.map((q: any) => v.content.words.find((w: any) => w.id === q.wordId).word);
    let r = await call(submit.POST, { method: 'POST', token, params: { id: v.id }, body: { answers: { quiz, sentences: ['Hello, my name is Ann.', 'Good morning, sir.'] }, elapsedSeconds: 240 } });
    expect(r.data.score).toBeGreaterThanOrEqual(90);
    expect(r.data.streak).toBe(1);

    r = await call(submit.POST, { method: 'POST', token, params: { id: byKind.phrases.id }, body: { answers: ['I am fine, thank you.', 'Nice to meet you.', 'My name is Ann.', 'Could you please help me?', 'Could you explain that again?'] } });
    expect(r.data.score).toBeGreaterThan(50);
    r = await call(submit.POST, { method: 'POST', token, params: { id: byKind.phrasal_verbs.id }, body: { answers: ['I will find out the train time.', 'I will look into it.', 'I will follow up with HR.'] } });
    expect(r.status).toBe(200);

    r = await call(submit.POST, { method: 'POST', token, params: { id: byKind.grammar.id }, body: { answers: ['am', 'is', 'are', 'are', 'is', 'I am a developer.'] } });
    expect(r.data.score).toBeGreaterThanOrEqual(90);
    expect(r.data.result.items[0].correct).toBe(true);

    const sp = byKind.speaking;
    const t1 = await call(turn.POST, { method: 'POST', token, params: { id: sp.id }, body: { index: 0, transcript: 'i is fine thank you', inputMode: 'text' } });
    expect(t1.data.evaluation.corrections.length).toBeGreaterThan(0);
    expect(t1.data.evaluation.natural_version).toBe('I am fine thank you.');
    expect(t1.data.pronunciationAssessed).toBe(false);
    expect(t1.data.next.index).toBe(1);
    r = await call(submit.POST, { method: 'POST', token, params: { id: sp.id }, body: { answers: ['', 'My name is Ann.', 'I am from Chennai.', 'I am a Technical Lead.', 'Nice to meet you too.'] } });
    expect(r.data.result.pronunciationAssessed).toBe(false);

    r = await call(submit.POST, { method: 'POST', token, params: { id: byKind.reading.id }, body: { answers: ['Madurai', 'Software developer', 'She is a teacher.', 'Six', 'Cricket and music'] } });
    expect(r.data.score).toBe(100);

    r = await call(submit.POST, { method: 'POST', token, params: { id: byKind.writing.id }, body: { answers: { text: 'Myself Ann. I is from Chennai. I am engineer. She have two brothers.' } } });
    expect(r.data.result.evaluator).toBe('rules');
    const ev = r.data.result.evaluation;
    expect(ev.corrections.length).toBeGreaterThanOrEqual(3);
    expect(ev.reference).toBeTruthy(); // revealed only after the attempt

    const rev = byKind.revision;
    r = await call(submit.POST, { method: 'POST', token, params: { id: rev.id }, body: { answers: rev.content.items.map((i: any) => i.options[0]) } });
    expect(r.status).toBe(200);

    r = await call(submit.POST, { method: 'POST', token, params: { id: byKind.mini_exam.id }, body: { answers: byKind.mini_exam.content.questions.map((q: any) => q.options[0]) } });
    expect(r.data.dayCompleted).toBe(true);
    expect(r.data.achievements).toContain('first-day');

    // idempotent re-submit
    r = await call(submit.POST, { method: 'POST', token, params: { id: byKind.mini_exam.id }, body: { answers: [] } });
    expect(r.data.alreadyCompleted).toBe(true);
  });

  it('tracks mistakes, schedules revision, and shows the dashboard', async () => {
    const d = (await call(dashboard.GET, { token })).data;
    expect(d.today.done).toBe(d.today.total);
    expect(d.streak.current).toBe(1);
    expect(d.skills.write.avg).not.toBeNull();
    expect(d.learningTime.totalMinutes).toBeGreaterThan(0);
    const p = (await call(progress.GET, { token })).data;
    expect(p.mistakes.map((m: any) => m.category)).toEqual(expect.arrayContaining(['be-verb', 'article', 'have-has']));
    expect(p.vocabulary.learned).toBe(10);
    const due = (await call(revisionDue.GET, { token })).data;
    expect(due.stages.length).toBeGreaterThan(0);
  });

  it('weak areas influence the next day (remedial grammar)', async () => {
    // add repeated be-verb mistakes, then simulate the next calendar day
    for (let i = 0; i < 3; i++) {
      const w = (await call(writing.GET, { token })).data[0];
      await call(writingSubmit.POST, { method: 'POST', token, params: { id: w.id }, body: { text: `They is happy ${i}. He are here.` } });
    }
    const { pool } = await import('@/lib/db');
    await pool().query(`UPDATE learning_days SET local_date = local_date - 1`);
    const t = (await call(today.GET, { token })).data;
    expect(t.day.day_number).toBe(2);
    const g = t.activities.find((a: any) => a.kind === 'grammar');
    expect(g.content.slug).toBe('is-am-are');
    expect(g.content.remedial).toBe(true);
    expect(t.activities.some((a: any) => a.kind === 'technical')).toBe(true); // simple patterns from Day 2
    const words = t.activities[0].content.words.map((w: any) => w.word);
    expect(words).not.toContain('hello'); // no repetition of learned words
  });

  it('runs a 100-mark exam with a full report; one exam does not promote', async () => {
    const start = await call(exams.POST, { method: 'POST', token, body: { examType: 'lesson' } });
    expect(start.status).toBe(200);
    const qs = start.data.questions;
    expect(qs.reduce((s: number, q: any) => s + q.marks, 0)).toBe(100);
    expect(qs[0].answer).toBeUndefined();
    const answers = Object.fromEntries(qs.map((q: any) => [q.id, q.options?.[0] ?? 'x']));
    const r = await call(examSubmit.POST, { method: 'POST', token, params: { id: start.data.id }, body: { answers } });
    expect(r.data).toMatchObject({ examType: 'lesson', threshold: 75 });
    for (const k of ['totalScore', 'skills', 'correct', 'incorrect', 'strengths', 'weaknesses', 'recommendations', 'nextPlan']) expect(r.data).toHaveProperty(k);
    expect(r.data.promotion.promoted).toBe(false);
    expect((await call(examSubmit.POST, { method: 'POST', token, params: { id: start.data.id }, body: { answers } })).status).toBe(409);
  });

  it('locks technical scenarios and seed-less lessons honestly', async () => {
    const list = (await call(technical.GET, { token })).data;
    const locked = list.find((x: any) => !x.unlocked);
    expect((await call(technicalOne.GET, { token, params: { id: locked.id } })).status).toBe(403);
    const stages = (await call(lessons.GET, { token })).data;
    expect(stages).toHaveLength(5);
    const missing = stages[4].topics[0];
    expect(missing.available).toBe(false);
    expect((await call(lessonOne.GET, { token, params: { slug: missing.slug } })).status).toBe(503);
  });

  it('never fakes a pronunciation score', async () => {
    const r = await call(pron.POST, { method: 'POST', token, body: { target: 'three', transcript: 'tree' } });
    expect(r.data.audioAssessed).toBe(false);
    expect(r.data.score).toBeNull();
    expect(r.data.recognised).toBe(false);
  });

  it('isolates data between users', async () => {
    const other = await call(register.POST, { method: 'POST', body: { email: `b${email}`, password: 'secret-pass-2', displayName: 'Bob' } });
    const t = (await call(today.GET, { token })).data;
    const r = await call(submit.POST, { method: 'POST', token: other.data.accessToken, params: { id: t.activities[0].id }, body: { answers: {} } });
    expect(r.status).toBe(404);
    const w = (await call(writing.GET, { token })).data[0];
    expect((await call(writingOne.GET, { token: other.data.accessToken, params: { id: w.id } })).data.reference_answer).toBeUndefined();
  });

  it('persists progress across logout/login and rotates refresh tokens', async () => {
    const r1 = await call(refresh.POST, { method: 'POST', cookie });
    expect(r1.status).toBe(200);
    const newCookie = r1.setCookie!.split(';')[0];
    // reusing the old (rotated) refresh token is rejected and revokes the family
    expect((await call(refresh.POST, { method: 'POST', cookie })).status).toBe(401);
    expect((await call(refresh.POST, { method: 'POST', cookie: newCookie })).status).toBe(401);
    await call(logout.POST, { method: 'POST', cookie: newCookie });
    expect((await call(login.POST, { method: 'POST', body: { email, password: 'wrong-password' } })).status).toBe(401);
    const l = await call(login.POST, { method: 'POST', body: { email, password: 'secret-pass-1' } });
    expect(l.data.user.onboarded).toBe(true);
    const d = (await call(dashboard.GET, { token: l.data.accessToken })).data;
    expect(d.learningTime.daysCompleted).toBe(1);
    token = l.data.accessToken;
  });

  it('reports health and deletes the account with all data', async () => {
    const h = await call(health.GET);
    expect(h.data).toMatchObject({ db: true, evaluation: 'rules' });
    expect((await call(me.DELETE, { method: 'DELETE', token, body: { confirm: 'nope' } })).status).toBe(400);
    expect((await call(me.DELETE, { method: 'DELETE', token, body: { confirm: 'DELETE' } })).status).toBe(200);
    const { pool } = await import('@/lib/db');
    const left = await pool().query(`SELECT count(*)::int AS n FROM skill_scores s LEFT JOIN users u ON u.id=s.user_id WHERE u.id IS NULL`);
    expect(left.rows[0].n).toBe(0);
    expect((await call(login.POST, { method: 'POST', body: { email, password: 'secret-pass-1' } })).status).toBe(401);
  });
});
