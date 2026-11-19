# Backend API Specification (`apps/api`, base `/api/v1`)

Envelope: success `{ "data": T, "meta"?: {...} }`, failure `{ "error": { "code": string, "message": string, "details"?: any } }`.
Auth: `Authorization: Bearer <accessToken>` unless marked *public*. Refresh token lives in an httpOnly cookie `fp_refresh`.

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| POST | `/auth/register` *public* | `{email,password,displayName}` | `{accessToken,user}` + cookie |
| POST | `/auth/login` *public* | `{email,password}` | `{accessToken,user}` + cookie |
| POST | `/auth/refresh` *public (cookie)* | – | `{accessToken,user}` (rotates cookie) |
| POST | `/auth/logout` | – | `{ok}` (revokes refresh) |
| GET | `/me` | – | user + profile + preferences |
| DELETE | `/me` | `{confirm:"DELETE"}` | `{ok}` – deletes account and all data |
| PUT | `/me/profile` | profile fields | profile |
| PUT | `/me/preferences` | preference fields | preferences |
| POST | `/onboarding` | full profile | profile (sets `onboarded_at`, creates Day 1) |
| GET | `/dashboard` | – | aggregated widget data |
| GET | `/daily/today` | – | today's learning day + activities (creates if absent) |
| POST | `/daily/activities/:id/start` | – | activity (status in_progress) |
| PUT | `/daily/activities/:id/state` | `{state}` | saves pause/resume state |
| POST | `/daily/activities/:id/submit` | `{answers}` | evaluation result; advances plan |
| POST | `/daily/today/complete` | – | day summary, streak |
| GET | `/content/levels` | – | 8 levels |
| GET | `/vocabulary/categories` | – | categories with counts + learner progress |
| GET | `/vocabulary/categories/:slug` | `?page&limit` | words (paginated) |
| POST | `/vocabulary/:id/practice` | `{task, answer}` | evaluation |
| GET | `/phrases` | `?kind=phrase\|phrasal_verb&page` | phrases |
| GET | `/lessons` | – | 5-stage syllabus with status |
| GET | `/lessons/:slug` | – | lesson content (no answers) |
| POST | `/lessons/:slug/submit` | `{answers}` | scored result + explanations |
| GET | `/reading` / `/reading/:id` | `?level` | passages (questions without answers) |
| POST | `/reading/:id/submit` | `{answers}` | score, explanations, corrections |
| GET | `/writing` / `/writing/:id` | – | exercises (no reference answer) |
| POST | `/writing/:id/submit` | `{text}` | corrections[], score, evaluator |
| GET | `/speaking` / `/speaking/:id` | – | exercise (questions) |
| POST | `/speaking/:id/turn` | `{questionIndex, transcript, inputMode:"text"\|"voice"}` | correction + next question |
| GET | `/technical` / `/technical/:id` | – | scenarios (locked below level 2) |
| POST | `/technical/:id/submit` | `{answers[]}` | clarity/grammar/vocab/tone/completeness |
| POST | `/pronunciation/attempt` | `{target, transcript?, audioAssessed:false}` | guidance; never fakes a score |
| POST | `/exams` | `{examType:"read"\|"write"\|"speak"\|"lesson"}` | attempt with randomized questions |
| GET | `/exams/:attemptId` | – | attempt (questions without answers) |
| POST | `/exams/:attemptId/submit` | `{answers}` | full report |
| GET | `/exams/history` | `?examType` | attempts |
| GET | `/progress` | – | skill scores, weekly, mistakes, level readiness |
| GET | `/revision/due` | – | due items |
| POST | `/revision/:id/review` | `{result:"correct"\|"wrong"}` | next due date |
| POST | `/agent/chat` | `{agent, message, sessionId?}` | tutor reply (Speaking/Writing coach chat) |
| GET | `/health` *public* | – | `{db, agent}` |

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN|LOCKED`, `404 NOT_FOUND`, `409 CONFLICT`, `429 RATE_LIMITED`, `500 INTERNAL`.

## Agent service (`services/agent`, internal)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | provider status |
| POST | `/v1/evaluate` | `{skill, task, answer, context}` → structured evaluation |
| POST | `/v1/next-activity` | learner context → orchestrator recommendation |
| POST | `/v1/chat` | `{agent, thread_id, message, context}` → tutor reply (LangGraph checkpointed) |
| POST | `/v1/generate` | `{kind, level, topic}` → AI content draft (stored with `source='ai'`) |
