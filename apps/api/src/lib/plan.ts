// Daily Learning Engine: builds one learning day of ~30 minutes, one activity at a time.
import pg from 'pg';
import { q, one } from './db';
import { localDate, MISTAKE_TO_TOPIC, Profile } from './learner';
import { publicPractice, publicReading, publicTurns, publicWriting, PracticeItem } from './content';

export const SCHEDULE: Array<{ kind: string; title: string; minutes: number }> = [
  { kind: 'vocabulary', title: '10 new words', minutes: 5 },
  { kind: 'phrases', title: '5 daily phrases', minutes: 2 },
  { kind: 'phrasal_verbs', title: '3 phrasal verbs', minutes: 1 },
  { kind: 'grammar', title: 'Grammar lesson', minutes: 5 },
  { kind: 'speaking', title: 'Speaking practice', minutes: 7 },
  { kind: 'reading', title: 'Reading', minutes: 3 },
  { kind: 'writing', title: 'Writing', minutes: 2 },
  { kind: 'technical', title: 'Workplace English', minutes: 2 },
  { kind: 'revision', title: 'Revision', minutes: 1 },
  { kind: 'mini_exam', title: 'Mini-exam', minutes: 2 },
];

export function shuffle<T>(arr: T[], rnd = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Simple workplace sentence patterns used for Level 1 instead of technical scenarios. */
const LEVEL1_WORKPLACE = [
  { prompt: 'What is your job title?', pattern: 'I am a ___.', sample: 'I am a Technical Lead.' },
  { prompt: 'Where do you work?', pattern: 'I work at ___ in ___.', sample: 'I work at an IT company in Chennai.' },
  { prompt: 'What do you work on?', pattern: 'I work on ___.', sample: 'I work on web applications.' },
];

interface Built { kind: string; title: string; minutes: number; content: unknown; key: unknown }

export async function getOrCreateToday(c: pg.PoolClient, userId: string, profile: Profile) {
  const today = localDate(profile.timezone);
  const latest = await one<{ id: string; status: string; local_date: string }>(
    `SELECT id, status, to_char(local_date,'YYYY-MM-DD') AS local_date FROM learning_days WHERE user_id=$1 ORDER BY day_number DESC LIMIT 1`, [userId], c);
  // Resume an unfinished day (pause/resume) or show today's completed day.
  if (latest && (latest.status === 'in_progress' || latest.local_date === today)) return latest.id;
  return createDay(c, userId, profile, profile.current_day + 1, today);
}

export async function createDay(c: pg.PoolClient, userId: string, profile: Profile, dayNumber: number, today: string): Promise<string> {
  const level = profile.level_id;
  const bp = await one<any>('SELECT title, blueprint FROM daily_learning_plans WHERE level_id=$1 AND day_number=$2', [level, dayNumber], c);
  const blueprint = bp?.blueprint ?? {};

  const words = await pickWords(c, userId, level, blueprint.vocab ?? []);
  const phraseItems = await pickPhrases(c, userId, level, 'phrase', 5);
  const pvItems = await pickPhrases(c, userId, level, 'phrasal_verb', 3);
  const lesson = await pickLesson(c, userId, dayNumber, blueprint.grammar);
  const reading = await pickContent(c, userId, 'reading', 'reading_passages', 'title', level, blueprint.reading);
  const writing = await pickContent(c, userId, 'writing', 'writing_exercises', 'topic', level, blueprint.writing);
  const speaking = await pickContent(c, userId, 'speaking', 'speaking_exercises', 'topic', level, blueprint.speaking);
  const technical = dayNumber === 1 ? null : level >= 2 ? await pickContent(c, userId, 'technical', 'technical_scenarios', 'title', level, undefined) : 'patterns';
  const revision = await pickRevision(c, userId, words);

  const built: Built[] = [];
  const add = (kind: string, content: unknown, key: unknown, title?: string) => {
    const s = SCHEDULE.find(x => x.kind === kind)!;
    built.push({ kind, title: title ?? s.title, minutes: s.minutes, content, key });
  };

  // 1. Vocabulary
  const quizWords = shuffle(words).slice(0, Math.min(5, words.length));
  add('vocabulary', {
    words,
    quiz: quizWords.map(w => ({ wordId: w.id, prompt: `Which English word means “${w.meaning_ta}”?`, options: shuffle([w.word, ...shuffle(words.filter(x => x.id !== w.id)).slice(0, 2).map(x => x.word)]) })),
    sentenceTasks: words.slice(0, 2).map(w => ({ wordId: w.id, word: w.word, prompt: `Make your own sentence with “${w.word}”.` })),
  }, { quiz: quizWords.map(w => w.word), sentenceWords: words.slice(0, 2).map(w => w.word), wordIds: words.map(w => w.id) });
  // 2–3. Phrases + phrasal verbs
  add('phrases', { items: phraseItems }, { ids: phraseItems.map(p => p.id) });
  add('phrasal_verbs', { items: pvItems }, { ids: pvItems.map(p => p.id), particles: pvItems.map(p => p.text) });
  // 4. Grammar
  if (lesson) {
    add('grammar', { slug: lesson.slug, title: lesson.title, stage: lesson.stage, explanation: lesson.explanation, explanation_ta: lesson.explanation_ta, rule: lesson.rule, basic_examples: lesson.basic_examples, professional_examples: lesson.professional_examples, practice: publicPractice(lesson.practice), source: lesson.source, remedial: lesson.remedial ?? false },
      { practice: lesson.practice, lessonId: lesson.topic_id }, `Grammar: ${lesson.title}`);
  }
  // 5. Speaking
  if (speaking) add('speaking', { id: speaking.id, topic: speaking.topic, intro: speaking.intro, questions: publicTurns(speaking.questions) }, { questions: speaking.questions, contentId: speaking.id }, `Speaking: ${speaking.topic}`);
  // 6. Reading
  if (reading) add('reading', publicReading(reading), { questions: reading.questions, contentId: reading.id }, `Reading: ${reading.title}`);
  // 7. Writing
  if (writing) add('writing', publicWriting(writing), { contentId: writing.id }, `Writing: ${writing.topic}`);
  // 8. Technical / workplace English (never on Day 1)
  if (technical === 'patterns') {
    add('technical', { mode: 'patterns', title: 'Talk about your job', situation: 'Simple sentences to describe your work.', questions: publicTurns(LEVEL1_WORKPLACE), key_terms: [] }, { questions: LEVEL1_WORKPLACE, contentId: null });
  } else if (technical) {
    add('technical', { mode: 'scenario', id: technical.id, title: technical.title, topic: technical.topic, situation: technical.situation, key_terms: technical.key_terms, questions: publicTurns(technical.questions) }, { questions: technical.questions, contentId: technical.id }, `Technical: ${technical.title}`);
  }
  // 9. Revision
  add('revision', { items: revision.items.map(({ answer, ...rest }) => rest) }, { items: revision.items });
  // 10. Mini-exam from today's content
  const mini = buildMiniExam(words, phraseItems, lesson?.practice ?? []);
  add('mini_exam', { questions: mini.map(({ answer, explanation, ...rest }) => rest) }, { questions: mini });

  const day = await one<{ id: string }>(
    `INSERT INTO learning_days(user_id, day_number, local_date, level_id, title) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [userId, dayNumber, today, level, bp?.title ?? `Day ${dayNumber}: ${lesson?.title ?? 'Practice'}`], c);
  let seq = 1;
  for (const a of built) {
    await q(`INSERT INTO learning_activities(learning_day_id, user_id, seq, kind, title, minutes, content, answer_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [day!.id, userId, seq++, a.kind, a.title, a.minutes, JSON.stringify(a.content), JSON.stringify(a.key)], c);
  }
  await q('UPDATE learner_profiles SET current_day=$2 WHERE user_id=$1', [userId, dayNumber], c);
  return day!.id;
}

async function pickWords(c: pg.PoolClient, userId: string, level: number, preferred: string[]) {
  // Avoid repetition: only words the learner has not studied yet. Preferred categories first.
  return q<any>(
    `SELECT v.id, v.word, v.meaning_ta, v.meaning_en, v.pronunciation, v.ipa, v.part_of_speech, v.example, v.example_ta, v.synonym, v.antonym, v.source, vc.name AS category
       FROM vocabulary v JOIN vocabulary_categories vc ON vc.id = v.category_id
      WHERE v.level_id <= $2 AND vc.min_level <= $2
        AND NOT EXISTS (SELECT 1 FROM vocabulary_progress vp WHERE vp.user_id=$1 AND vp.vocabulary_id=v.id)
      ORDER BY (vc.slug = ANY($3::text[])) DESC, array_position($3::text[], vc.slug), vc.sort, v.sort
      LIMIT 10`, [userId, level, preferred], c);
}

async function pickPhrases(c: pg.PoolClient, userId: string, level: number, kind: string, n: number) {
  return q<any>(
    `SELECT id, text, meaning, meaning_ta, pronunciation, example, situation, practice_question, source FROM phrases p
      WHERE kind=$2 AND level_id <= $3 AND NOT EXISTS (SELECT 1 FROM phrase_progress pp WHERE pp.user_id=$1 AND pp.phrase_id=p.id)
      ORDER BY level_id, sort LIMIT $4`, [userId, kind, level, n], c);
}

async function pickLesson(c: pg.PoolClient, userId: string, dayNumber: number, blueprintSlug?: string) {
  const base = `SELECT gt.id AS topic_id, gt.slug, gt.title, gt.stage, l.* FROM grammar_topics gt JOIN lessons l ON l.grammar_topic_id = gt.id`;
  // Weak areas first: a mistake category that keeps recurring AFTER the learner last studied its lesson
  // (a good lesson score alone doesn't hide continuing mistakes in writing/speaking).
  if (dayNumber > 1) {
    const weak = await q<{ category: string; n: number; last: Date }>(
      `SELECT category, sum(occurrences)::int AS n, max(last_seen_at) AS last FROM mistake_records
        WHERE user_id=$1 AND resolved_at IS NULL GROUP BY category HAVING sum(occurrences) >= 3 ORDER BY n DESC LIMIT 3`, [userId], c);
    for (const w of weak) {
      const slug = MISTAKE_TO_TOPIC[w.category];
      if (!slug) continue;
      const l = await one<any>(`${base} WHERE gt.slug=$2 AND NOT EXISTS (SELECT 1 FROM content_progress cp WHERE cp.user_id=$1 AND cp.content_type='grammar' AND cp.content_id=gt.id AND cp.last_attempt_at > $3)`, [userId, slug, w.last], c);
      if (l) return { ...l, remedial: true };
    }
  }
  if (blueprintSlug) {
    const l = await one<any>(`${base} WHERE gt.slug=$1`, [blueprintSlug], c);
    if (l) return l;
  }
  return one<any>(`${base} LEFT JOIN content_progress cp ON cp.user_id=$1 AND cp.content_type='grammar' AND cp.content_id=gt.id
    ORDER BY (coalesce(cp.best_score,0) >= 75), cp.attempts NULLS FIRST, gt.stage, gt.sort LIMIT 1`, [userId], c);
}

async function pickContent(c: pg.PoolClient, userId: string, type: string, table: string, titleCol: string, level: number, preferred?: string) {
  if (preferred) {
    const r = await one<any>(`SELECT * FROM ${table} WHERE ${titleCol}=$1`, [preferred], c);
    if (r) return r;
  }
  return one<any>(`SELECT t.* FROM ${table} t LEFT JOIN content_progress cp ON cp.user_id=$1 AND cp.content_type=$2 AND cp.content_id=t.id
     WHERE t.level_id <= $3 ORDER BY coalesce(cp.attempts,0), t.level_id DESC, t.sort LIMIT 1`, [userId, type, level], c);
}

export interface RevisionItem { revisionId: string | null; type: string; prompt: string; options: string[]; answer: string; hint?: string }

async function pickRevision(c: pg.PoolClient, userId: string, todaysWords: any[]): Promise<{ items: RevisionItem[] }> {
  const due = await q<any>(
    `SELECT rs.id, rs.item_type, rs.item_id,
            v.word, v.meaning_ta, p.text AS phrase, p.meaning AS phrase_meaning, m.original, m.corrected, m.explanation
       FROM revision_schedules rs
       LEFT JOIN vocabulary v ON rs.item_type='vocabulary' AND v.id=rs.item_id
       LEFT JOIN phrases p ON rs.item_type='phrase' AND p.id=rs.item_id
       LEFT JOIN mistake_records m ON rs.item_type='mistake' AND m.id=rs.item_id
      WHERE rs.user_id=$1 AND rs.stage < 5 AND rs.due_at <= now() + interval '12 hours'
      ORDER BY (rs.item_type='mistake') DESC, rs.due_at LIMIT 6`, [userId], c);
  const items: RevisionItem[] = [];
  const distractorWords = (await q<{ word: string }>('SELECT word FROM vocabulary ORDER BY random() LIMIT 10', [], c)).map(r => r.word);
  for (const d of due) {
    const it = toRevisionItem(d, distractorWords);
    if (it) items.push(it);
  }
  if (!items.length) {
    // Day 1 / nothing due: same-day recall of today's words.
    for (const w of todaysWords.slice(0, 3)) {
      items.push({ revisionId: null, type: 'vocabulary', prompt: `Recall: “${w.meaning_ta}” in English is…`, options: shuffle([w.word, ...shuffle(todaysWords.filter(x => x.id !== w.id)).slice(0, 2).map(x => x.word)]), answer: w.word });
    }
  }
  return { items };
}

export function toRevisionItem(d: any, distractors: string[]): RevisionItem | null {
  if (d.item_type === 'vocabulary' && d.word) {
    return { revisionId: d.id, type: 'vocabulary', prompt: `“${d.meaning_ta}” in English is…`, options: shuffle([d.word, ...distractors.filter(x => x !== d.word).slice(0, 2)]), answer: d.word };
  }
  if (d.item_type === 'phrase' && d.phrase) {
    return { revisionId: d.id, type: 'phrase', prompt: `Type the phrase that means: “${d.phrase_meaning}”`, options: [], answer: d.phrase, hint: d.phrase.split(' ').slice(0, 2).join(' ') + ' …' };
  }
  if (d.item_type === 'mistake' && d.original) {
    return { revisionId: d.id, type: 'mistake', prompt: `Correct this sentence: “${d.original}”`, options: [], answer: d.corrected, hint: d.explanation };
  }
  return null;
}

export interface MiniQ { prompt: string; kind: 'mcq'; options: string[]; answer: string; explanation: string }
export function buildMiniExam(words: any[], phrases: any[], practice: PracticeItem[]): MiniQ[] {
  const qs: MiniQ[] = [];
  for (const w of shuffle(words).slice(0, 3)) {
    qs.push({ prompt: `What does “${w.word}” mean?`, kind: 'mcq', options: shuffle([w.meaning_en, ...shuffle(words.filter(x => x.id !== w.id)).slice(0, 2).map(x => x.meaning_en)]), answer: w.meaning_en, explanation: `${w.word} = ${w.meaning_ta} (${w.meaning_en}).` });
  }
  if (phrases.length >= 2) {
    const p = phrases[Math.floor(Math.random() * phrases.length)];
    qs.push({ prompt: `Which phrase fits? ${p.situation}`, kind: 'mcq', options: shuffle([p.text, ...shuffle(phrases.filter(x => x.id !== p.id)).slice(0, 2).map(x => x.text)]), answer: p.text, explanation: `“${p.text}” — ${p.meaning}.` });
  }
  const g = practice.filter(x => x.kind === 'mcq');
  if (g.length) {
    const item = g[g.length - 1];
    qs.push({ prompt: item.prompt, kind: 'mcq', options: item.options ?? [], answer: item.answer[0], explanation: item.explanation });
  }
  return qs;
}
