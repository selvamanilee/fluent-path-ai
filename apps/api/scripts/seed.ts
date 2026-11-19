// Idempotent seed of reviewed (source='seed') curriculum content.
import pg from 'pg';
import { databaseUrl } from '../src/lib/database-url.ts';
import { categories } from '../src/seed/vocabulary.ts';
import { phrases, phrasalVerbs } from '../src/seed/phrases.ts';
import { topics, lessons } from '../src/seed/grammar.ts';
import { levels, achievements, reading, writing, speaking, technical, examBank, plans } from '../src/seed/exercises.ts';

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
const run = (sql: string, params: unknown[] = []) => client.query(sql, params as any[]);
const J = JSON.stringify;
try {
  await run('BEGIN');
  for (const [id, code, name, desc] of levels)
    await run(`INSERT INTO learning_levels(id, code, name, description) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET name=$3, description=$4`, [id, code, name, desc]);
  for (const [code, title, desc, icon] of achievements)
    await run(`INSERT INTO achievements(code, title, description, icon) VALUES ($1,$2,$3,$4) ON CONFLICT (code) DO UPDATE SET title=$2, description=$3, icon=$4`, [code, title, desc, icon]);

  let ci = 0, words = 0;
  for (const c of categories) {
    const { rows } = await run(`INSERT INTO vocabulary_categories(slug, name, name_ta, icon, min_level, sort) VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (slug) DO UPDATE SET name=$2, name_ta=$3, icon=$4, min_level=$5, sort=$6 RETURNING id`, [c.slug, c.name, c.name_ta, c.icon, c.min_level ?? 1, ci++]);
    let wi = 0;
    for (const [word, ta, en, pron, ipa, pos, ex, exTa, syn, ant] of c.words) {
      await run(`INSERT INTO vocabulary(category_id, word, meaning_ta, meaning_en, pronunciation, ipa, part_of_speech, example, example_ta, synonym, antonym, level_id, sort)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (category_id, word) DO UPDATE SET meaning_ta=$3, meaning_en=$4, pronunciation=$5, ipa=$6, part_of_speech=$7, example=$8, example_ta=$9, synonym=$10, antonym=$11, level_id=$12, sort=$13`,
        [rows[0].id, word, ta, en, pron, ipa, pos, ex, exTa, syn, ant, c.min_level ?? 1, wi++]);
      words++;
    }
  }
  let pi = 0;
  for (const [kind, list] of [['phrase', phrases], ['phrasal_verb', phrasalVerbs]] as const)
    for (const [text, meaning, ta, pron, ex, sit, pq, level] of list)
      await run(`INSERT INTO phrases(kind, text, meaning, meaning_ta, pronunciation, example, situation, practice_question, level_id, sort)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (text) DO UPDATE SET meaning=$3, meaning_ta=$4, pronunciation=$5, example=$6, situation=$7, practice_question=$8, level_id=$9, sort=$10`,
        [kind, text, meaning, ta, pron, ex, sit, pq, level, pi++]);

  let ti = 0;
  for (const [stage, slug, title] of topics)
    await run(`INSERT INTO grammar_topics(stage, slug, title, sort) VALUES ($1,$2,$3,$4) ON CONFLICT (slug) DO UPDATE SET stage=$1, title=$3, sort=$4`, [stage, slug, title, ti++]);
  for (const l of lessons) {
    await run(`INSERT INTO lessons(grammar_topic_id, explanation, explanation_ta, rule, basic_examples, professional_examples, practice)
      SELECT id, $2, $3, $4, $5, $6, $7 FROM grammar_topics WHERE slug=$1
      ON CONFLICT (grammar_topic_id) DO UPDATE SET explanation=$2, explanation_ta=$3, rule=$4, basic_examples=$5, professional_examples=$6, practice=$7, source='seed'`,
      [l.slug, l.explanation, l.explanation_ta, l.rule, J(l.basic), J(l.professional), J(l.practice)]);
  }
  let si = 0;
  for (const r of reading)
    await run(`INSERT INTO reading_passages(level_id, title, body, difficult_words, sentence_meanings, questions, sort) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (title) DO UPDATE SET level_id=$1, body=$3, difficult_words=$4, sentence_meanings=$5, questions=$6, sort=$7`,
      [r.level, r.title, r.body, J(r.words.map(([word, meaning, meaning_ta]) => ({ word, meaning, meaning_ta }))),
       J((r.body.match(/[^.!?]+[.!?]/g) ?? []).map((s, i) => ({ sentence: s.trim(), meaning_ta: r.meanings_ta[i] ?? '' }))), J(r.questions), si++]);
  for (const w of writing)
    await run(`INSERT INTO writing_exercises(level_id, topic, instructions, instructions_ta, min_sentences, keywords, reference_answer, sort) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (topic) DO UPDATE SET level_id=$1, instructions=$3, instructions_ta=$4, min_sentences=$5, keywords=$6, reference_answer=$7, sort=$8`,
      [w.level, w.topic, w.instructions, w.instructions_ta, w.min, w.keywords, w.reference, si++]);
  for (const s of speaking)
    await run(`INSERT INTO speaking_exercises(level_id, topic, intro, questions, sort) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (topic) DO UPDATE SET level_id=$1, intro=$3, questions=$4, sort=$5`, [s.level, s.topic, s.intro, J(s.questions), si++]);
  for (const t of technical)
    await run(`INSERT INTO technical_scenarios(level_id, topic, title, situation, questions, key_terms, sort) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (title) DO UPDATE SET level_id=$1, topic=$2, situation=$4, questions=$5, key_terms=$6, sort=$7`,
      [t.level, t.topic, t.title, t.situation, J(t.questions), J(t.terms.map(([term, meaning, meaning_ta]) => ({ term, meaning, meaning_ta }))), si++]);
  for (const x of examBank)
    await run(`INSERT INTO exam_questions(exam_type, skill, level_id, difficulty, kind, prompt, context, options, answer, explanation, marks) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (exam_type, prompt) DO UPDATE SET skill=$2, level_id=$3, difficulty=$4, kind=$5, context=$7, options=$8, answer=$9, explanation=$10, marks=$11`,
      [x.type, x.skill, x.level, x.difficulty, x.kind, x.prompt, x.context ?? null, x.options ? J(x.options) : null, J(x.answer), x.explanation, x.marks]);
  for (const p of plans)
    await run(`INSERT INTO daily_learning_plans(level_id, day_number, title, blueprint) VALUES (1,$1,$2,$3)
      ON CONFLICT (level_id, day_number) DO UPDATE SET title=$2, blueprint=$3`, [p.day, p.title, J({ grammar: p.grammar, reading: p.reading, writing: p.writing, speaking: p.speaking, vocab: p.vocab })]);
  await run('COMMIT');
  console.log(`seeded: ${categories.length} categories, ${words} words, ${phrases.length + phrasalVerbs.length} phrases, ${topics.length} topics, ${lessons.length} lessons, ${examBank.length} exam questions`);
} catch (e) {
  await run('ROLLBACK');
  console.error(e);
  process.exitCode = 1;
} finally {
  await client.end();
}
