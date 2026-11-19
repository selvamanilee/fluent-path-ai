# Database ER Diagram & Data Model

Source of truth: `db/migrations/*.sql`. All timestamps are `timestamptz` (stored UTC); the learner's IANA timezone is stored on the profile and used to compute the *local learning date*.

Every content table has `source text CHECK (source IN ('seed','ai','user'))` and, for AI content, `model text` so generated lessons are distinguishable from reviewed seed content.

```mermaid
erDiagram
  users ||--|| learner_profiles : has
  users ||--|| user_preferences : has
  users ||--o{ refresh_tokens : owns
  users ||--o{ learning_days : "learns on"
  users ||--|| learning_streaks : tracks
  users ||--o{ exam_attempts : takes
  users ||--o{ skill_scores : earns
  users ||--o{ mistake_records : makes
  users ||--o{ revision_schedules : revises
  users ||--o{ vocabulary_progress : studies
  users ||--o{ user_achievements : unlocks
  users ||--o{ agent_sessions : chats
  users ||--o{ pronunciation_attempts : records

  learning_levels ||--o{ learner_profiles : "current level"
  learning_levels ||--o{ daily_learning_plans : "templates for"
  learning_days ||--o{ learning_activities : contains
  daily_learning_plans ||--o{ learning_days : "instantiated as"

  vocabulary_categories ||--o{ vocabulary : groups
  vocabulary ||--o{ vocabulary_progress : tracked
  grammar_topics ||--o{ lessons : "taught by"

  exam_attempts ||--o{ exam_answers : contains
  exam_questions ||--o{ exam_answers : answered
  achievements ||--o{ user_achievements : awarded

  users { uuid id PK; citext email UK; text password_hash; text display_name; text role; timestamptz deleted_at }
  learner_profiles { uuid user_id PK,FK; text native_language; smallint level_id FK; int daily_minutes; text priority; text[] technical_skills; text timezone; int current_day }
  user_preferences { uuid user_id PK,FK; text theme; text tamil_support; bool voice_enabled; int audio_retention_days }
  learning_levels { smallint id PK; text name; numeric pass_threshold }
  daily_learning_plans { uuid id PK; smallint level_id FK; int day_number; jsonb blueprint; text source }
  learning_days { uuid id PK; uuid user_id FK; int day_number; date local_date; text status; int seconds_spent }
  learning_activities { uuid id PK; uuid learning_day_id FK; smallint seq; text kind; jsonb content; jsonb state; text status; numeric score }
  vocabulary { uuid id PK; uuid category_id FK; text word; text meaning_ta; text ipa; text part_of_speech; smallint level_id }
  vocabulary_progress { uuid user_id PK; uuid vocabulary_id PK; text status; int correct_count; int wrong_count }
  phrases { uuid id PK; text text; text meaning_ta; text kind "phrase|phrasal_verb" }
  grammar_topics { uuid id PK; smallint stage; text slug UK; text title }
  lessons { uuid id PK; uuid grammar_topic_id FK; text explanation; text explanation_ta; jsonb basic_examples; jsonb practice }
  reading_passages { uuid id PK; smallint level_id; jsonb difficult_words; jsonb questions }
  writing_exercises { uuid id PK; smallint level_id; text topic; jsonb rubric }
  speaking_exercises { uuid id PK; smallint level_id; jsonb questions }
  technical_scenarios { uuid id PK; smallint level_id; text situation; jsonb questions }
  exam_questions { uuid id PK; text exam_type; text skill; smallint difficulty; text kind; jsonb options; jsonb answer }
  exam_attempts { uuid id PK; uuid user_id FK; text exam_type; numeric percent; jsonb report }
  exam_answers { uuid id PK; uuid attempt_id FK; uuid question_id FK; bool is_correct; numeric marks }
  skill_scores { uuid id PK; uuid user_id FK; text skill; numeric score; numeric max }
  mistake_records { uuid id PK; uuid user_id FK; text category; text original; text corrected; int occurrences }
  revision_schedules { uuid id PK; uuid user_id FK; text item_type; uuid item_id; smallint stage; timestamptz due_at }
  learning_streaks { uuid user_id PK; int current; int longest; date last_active_date }
  achievements { text code PK; text title }
  agent_sessions { uuid id PK; uuid user_id FK; text agent; jsonb messages; text status }
  pronunciation_attempts { uuid id PK; uuid user_id FK; text target; bool audio_assessed; numeric score }
```

## Notes

* **Phrases & phrasal verbs** share one table (`phrases.kind`) — identical shape, simpler queries. The spec's `Phrases` and `PhrasalVerbs` entities map to `kind='phrase'` and `kind='phrasal_verb'`.
* **Lessons/Grammar** — `grammar_topics` is the 5-stage syllabus; `lessons` holds the teaching content (seed or AI).
* **Indexes**: `revision_schedules(user_id, due_at)`, `learning_activities(learning_day_id, seq)`, `mistake_records(user_id, category)`, `skill_scores(user_id, skill, created_at)`, `vocabulary(category_id, level_id)`, `exam_attempts(user_id, exam_type, submitted_at)`.
* **Isolation**: every user-owned table has `user_id` with `ON DELETE CASCADE`, so account deletion removes all learner data.
