import { describe, it, expect } from 'vitest';
import { rulesEvaluate, checkSentence, isCorrect, normalize } from '@/lib/evaluate';

describe('objective answers', () => {
  it('normalizes case, spacing, smart quotes and trailing punctuation', () => {
    expect(normalize('  I Am  a Developer. ')).toBe('i am a developer');
    expect(isCorrect('Let’s go!', ["let's go"])).toBe(true);
    expect(isCorrect('', ['a'])).toBe(false);
  });
});

describe('rule-based checker (common Tamil-speaker errors)', () => {
  const fix = (s: string) => checkSentence(s).corrected;
  it('fixes be-verb agreement', () => {
    expect(fix('He are my friend.')).toBe('He is my friend.');
    expect(fix('I is happy.')).toBe('I am happy.');
    expect(fix('They is late.')).toBe('They are late.');
  });
  it('fixes have/has', () => {
    expect(fix('I has a laptop.')).toBe('I have a laptop.');
    expect(fix('She have two brothers.')).toBe('She has two brothers.');
  });
  it('adds third-person -s but not after auxiliaries in questions', () => {
    expect(fix('She work in Chennai.')).toBe('She works in Chennai.');
    expect(fix('He watch TV.')).toBe('He watches TV.');
    expect(fix('Does she work in Chennai?')).toBe('Does she work in Chennai?');
    expect(fix('Can he go now?')).toBe('Can he go now?');
  });
  it('fixes base verb after modals', () => {
    expect(fix('She can speaks English.')).toBe('She can speak English.');
    expect(fix('I will has a meeting.')).toBe('I will have a meeting.');
  });
  it('fixes articles with exceptions', () => {
    expect(fix('I am engineer.')).toBe('I am an engineer.');
    expect(fix('I ate a apple.')).toBe('I ate an apple.');
    expect(fix('She is a user.')).toBe('She is a user.');
    expect(fix('It takes an hour.')).toBe('It takes an hour.');
  });
  it('fixes "Myself <Name>" and capitalization / punctuation', () => {
    expect(fix('Myself Ravi')).toBe('My name is Ravi.');
    expect(fix('i am fine')).toBe('I am fine.');
    expect(fix('where are you from')).toBe('Where are you from?');
  });
  it('leaves correct sentences untouched', () => {
    for (const s of ['I am a Technical Lead.', 'We deploy on Fridays.', 'She is my sister.', 'They have two meetings today.'])
      expect(checkSentence(s).corrections).toEqual([]);
  });
});

describe('rulesEvaluate', () => {
  it('returns 0 and guidance for an empty answer', () => {
    const r = rulesEvaluate({ prompt: 'x', answer: '  ' });
    expect(r.score).toBe(0);
    expect(r.evaluator).toBe('rules');
  });
  it('scores a correct answer highly and a wrong one lower, with corrections', () => {
    const good = rulesEvaluate({ prompt: 'Introduce yourself', answer: 'My name is Selvam. I am from Trichy. I am a developer.', keywords: ['name', 'am', 'from'], minSentences: 3 });
    const bad = rulesEvaluate({ prompt: 'Introduce yourself', answer: 'myself Selvam. i is from trichy. i am developer', keywords: ['name', 'am', 'from'], minSentences: 3 });
    expect(good.score).toBeGreaterThanOrEqual(90);
    expect(bad.score).toBeLessThan(good.score);
    expect(bad.corrections.length).toBeGreaterThanOrEqual(3);
    expect(bad.natural_version).toContain('I am from trichy.');
    expect(bad.corrections[0]).toMatchObject({ original: expect.any(String), corrected: expect.any(String), explanation: expect.any(String) });
  });
  it('penalizes too few sentences', () => {
    const r = rulesEvaluate({ prompt: 'x', answer: 'I am Ravi.', minSentences: 3 });
    expect(r.criteria!.completeness).toBeLessThan(50);
  });
});
