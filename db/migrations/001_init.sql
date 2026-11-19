-- FluentPath AI — initial schema
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE learning_levels (
  id smallint PRIMARY KEY CHECK (id BETWEEN 1 AND 8),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  pass_threshold numeric(5,2) NOT NULL DEFAULT 75
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'learner' CHECK (role IN ('learner','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON refresh_tokens(user_id);

CREATE TABLE learner_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  native_language text NOT NULL DEFAULT 'Tamil',
  level_id smallint NOT NULL DEFAULT 1 REFERENCES learning_levels(id),
  daily_minutes int NOT NULL DEFAULT 30 CHECK (daily_minutes BETWEEN 10 AND 120),
  learning_method text NOT NULL DEFAULT 'Interactive conversation',
  priority text NOT NULL DEFAULT 'Speaking and professional communication',
  professional_background text NOT NULL DEFAULT '',
  technical_skills text[] NOT NULL DEFAULT '{}',
  career_objective text NOT NULL DEFAULT '',
  challenges text[] NOT NULL DEFAULT '{}',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  current_day int NOT NULL DEFAULT 0,
  onboarded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('system','light','dark')),
  tamil_support text NOT NULL DEFAULT 'when_needed' CHECK (tamil_support IN ('always','when_needed','off')),
  voice_enabled boolean NOT NULL DEFAULT true,
  speech_rate numeric(3,2) NOT NULL DEFAULT 0.9,
  audio_retention_days int NOT NULL DEFAULT 0 CHECK (audio_retention_days BETWEEN 0 AND 30),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Content ----------
CREATE TABLE vocabulary_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  name_ta text NOT NULL,
  icon text NOT NULL DEFAULT 'book',
  min_level smallint NOT NULL DEFAULT 1,
  sort int NOT NULL DEFAULT 0
);

CREATE TABLE vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES vocabulary_categories(id) ON DELETE CASCADE,
  word text NOT NULL,
  meaning_ta text NOT NULL,
  meaning_en text NOT NULL,
  pronunciation text NOT NULL,
  ipa text,
  part_of_speech text NOT NULL,
  example text NOT NULL,
  example_ta text NOT NULL,
  synonym text,
  antonym text,
  level_id smallint NOT NULL DEFAULT 1 REFERENCES learning_levels(id),
  sort int NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','ai','user')),
  model text,
  UNIQUE (category_id, word)
);
CREATE INDEX ON vocabulary(level_id, sort);

CREATE TABLE phrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('phrase','phrasal_verb')),
  text text NOT NULL UNIQUE,
  meaning text NOT NULL,
  meaning_ta text NOT NULL,
  pronunciation text NOT NULL,
  example text NOT NULL,
  situation text NOT NULL,
  practice_question text NOT NULL,
  level_id smallint NOT NULL DEFAULT 1 REFERENCES learning_levels(id),
  sort int NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','ai','user')),
  model text
);
CREATE INDEX ON phrases(kind, level_id, sort);

CREATE TABLE grammar_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage smallint NOT NULL CHECK (stage BETWEEN 1 AND 5),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  sort int NOT NULL DEFAULT 0
);

CREATE TABLE lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grammar_topic_id uuid NOT NULL UNIQUE REFERENCES grammar_topics(id) ON DELETE CASCADE,
  explanation text NOT NULL,
  explanation_ta text NOT NULL,
  rule text NOT NULL,
  basic_examples jsonb NOT NULL,
  professional_examples jsonb NOT NULL,
  practice jsonb NOT NULL, -- [{prompt, kind:'mcq'|'fill'|'correct'|'free', options?, answer, explanation}]
  source text NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','ai','user')),
  model text
);

CREATE TABLE reading_passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id smallint NOT NULL REFERENCES learning_levels(id),
  title text NOT NULL UNIQUE,
  body text NOT NULL,
  difficult_words jsonb NOT NULL,     -- [{word, meaning, meaning_ta}]
  sentence_meanings jsonb NOT NULL,   -- [{sentence, meaning_ta}]
  questions jsonb NOT NULL,           -- [{prompt, options[], answer, explanation}]
  sort int NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','ai','user')),
  model text
);

CREATE TABLE writing_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id smallint NOT NULL REFERENCES learning_levels(id),
  topic text NOT NULL UNIQUE,
  instructions text NOT NULL,
  instructions_ta text NOT NULL,
  min_sentences int NOT NULL DEFAULT 3,
  keywords text[] NOT NULL DEFAULT '{}',
  reference_answer text NOT NULL,     -- never sent before the learner submits
  sort int NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','ai','user')),
  model text
);

CREATE TABLE speaking_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id smallint NOT NULL REFERENCES learning_levels(id),
  topic text NOT NULL UNIQUE,
  intro text NOT NULL,
  questions jsonb NOT NULL,           -- [{prompt, prompt_ta, pattern, sample}]
  sort int NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','ai','user')),
  model text
);

CREATE TABLE technical_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id smallint NOT NULL REFERENCES learning_levels(id),
  topic text NOT NULL,
  title text NOT NULL UNIQUE,
  situation text NOT NULL,
  questions jsonb NOT NULL,           -- [{prompt, pattern, sample}]
  key_terms jsonb NOT NULL,           -- [{term, meaning, meaning_ta}]
  sort int NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','ai','user')),
  model text
);

CREATE TABLE exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type text NOT NULL CHECK (exam_type IN ('read','write','speak','lesson')),
  skill text NOT NULL,
  level_id smallint NOT NULL REFERENCES learning_levels(id),
  difficulty smallint NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  kind text NOT NULL CHECK (kind IN ('mcq','fill','correct','free')),
  prompt text NOT NULL,
  context text,
  options jsonb,
  answer jsonb,                       -- array of accepted answers (objective) or rubric keywords (free)
  explanation text NOT NULL,
  marks int NOT NULL DEFAULT 10,
  source text NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','ai','user')),
  UNIQUE (exam_type, prompt)
);
CREATE INDEX ON exam_questions(exam_type, level_id);

CREATE TABLE daily_learning_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id smallint NOT NULL REFERENCES learning_levels(id),
  day_number int NOT NULL,
  title text NOT NULL,
  blueprint jsonb NOT NULL,           -- {grammar, reading, writing, speaking, technical?, vocabCategories[]}
  source text NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','ai','user')),
  UNIQUE (level_id, day_number)
);

-- ---------- Learner data ----------
CREATE TABLE learning_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_number int NOT NULL,
  local_date date NOT NULL,
  level_id smallint NOT NULL REFERENCES learning_levels(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  seconds_spent int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, day_number)
);
CREATE INDEX ON learning_days(user_id, local_date);

CREATE TABLE learning_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_day_id uuid NOT NULL REFERENCES learning_days(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seq smallint NOT NULL,
  kind text NOT NULL CHECK (kind IN ('vocabulary','phrases','phrasal_verbs','grammar','reading','writing','speaking','technical','revision','mini_exam')),
  title text NOT NULL,
  minutes smallint NOT NULL,
  content jsonb NOT NULL,             -- learner-safe payload (no answers)
  answer_key jsonb NOT NULL DEFAULT '{}', -- server-only
  state jsonb NOT NULL DEFAULT '{}',  -- pause/resume state
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done')),
  score numeric(5,2),
  result jsonb,
  completed_at timestamptz,
  UNIQUE (learning_day_id, seq)
);
CREATE INDEX ON learning_activities(user_id, status);

CREATE TABLE vocabulary_progress (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vocabulary_id uuid NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'learning' CHECK (status IN ('learning','mastered')),
  correct_count int NOT NULL DEFAULT 0,
  wrong_count int NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, vocabulary_id)
);

CREATE TABLE phrase_progress (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phrase_id uuid NOT NULL REFERENCES phrases(id) ON DELETE CASCADE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, phrase_id)
);

CREATE TABLE content_progress (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('grammar','reading','writing','speaking','technical')),
  content_id uuid NOT NULL,
  best_score numeric(5,2),
  attempts int NOT NULL DEFAULT 0,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, content_type, content_id)
);

CREATE TABLE exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_type text NOT NULL CHECK (exam_type IN ('read','write','speak','lesson','mini')),
  level_id smallint NOT NULL REFERENCES learning_levels(id),
  question_ids uuid[] NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  total_score numeric(6,2),
  max_score numeric(6,2),
  percent numeric(5,2),
  report jsonb
);
CREATE INDEX ON exam_attempts(user_id, exam_type, submitted_at DESC);

CREATE TABLE exam_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES exam_questions(id),
  answer text NOT NULL,
  is_correct boolean NOT NULL,
  marks_awarded numeric(5,2) NOT NULL,
  feedback jsonb,
  UNIQUE (attempt_id, question_id)
);

CREATE TABLE skill_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill text NOT NULL CHECK (skill IN ('read','write','speak','lesson','vocabulary','technical','pronunciation')),
  score numeric(6,2) NOT NULL,
  max_score numeric(6,2) NOT NULL DEFAULT 100,
  source_kind text NOT NULL,
  source_id uuid,
  evaluator text NOT NULL DEFAULT 'rules' CHECK (evaluator IN ('rules','llm','objective')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON skill_scores(user_id, skill, created_at DESC);

CREATE TABLE mistake_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill text NOT NULL,
  category text NOT NULL,
  original text NOT NULL,
  corrected text NOT NULL,
  explanation text NOT NULL,
  occurrences int NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (user_id, original, corrected)
);
CREATE INDEX ON mistake_records(user_id, category);

CREATE TABLE revision_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('vocabulary','phrase','mistake','grammar')),
  item_id uuid NOT NULL,
  stage smallint NOT NULL DEFAULT 0 CHECK (stage BETWEEN 0 AND 5), -- 5 = mastered
  due_at timestamptz NOT NULL,
  last_result text,
  review_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);
CREATE INDEX ON revision_schedules(user_id, due_at) WHERE stage < 5;

CREATE TABLE learning_streaks (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current int NOT NULL DEFAULT 0,
  longest int NOT NULL DEFAULT 0,
  last_active_date date
);

CREATE TABLE achievements (
  code text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'award'
);

CREATE TABLE user_achievements (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_code text NOT NULL REFERENCES achievements(code),
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_code)
);

CREATE TABLE agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON agent_sessions(user_id, updated_at DESC);

CREATE TABLE pronunciation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target text NOT NULL,
  transcript text,
  audio_assessed boolean NOT NULL DEFAULT false,
  score numeric(5,2),               -- NULL unless audio_assessed
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (audio_assessed OR score IS NULL)
);
