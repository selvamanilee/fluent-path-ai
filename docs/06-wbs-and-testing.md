# Implementation WBS, Testing Strategy & Checklist

## WBS

| Phase | Deliverables | Status |
|---|---|---|
| 1 Setup & design system | Monorepo, docs, tokens (light/dark), icon set, compose file | ✅ |
| 2 Auth, onboarding, profile | Register/login/refresh/logout, onboarding wizard, settings | ✅ |
| 3 Dashboard & navigation | Shell (bottom bar / side rail), dashboard widgets | ✅ |
| 4 Daily learning engine | Plan generation, 10 activities, one-at-a-time player, pause/resume | ✅ |
| 5 Read / Write / Speak / Lesson | Module hubs + exercises + evaluation | ✅ (seed content Level 1–2) |
| 6 Vocabulary, pronunciation, revision | 27 categories, word cards, TTS, SRS queue | ✅ |
| 7 Technical English | Scenarios with 5-question structure, locked on Day 1 / Level 1 | ✅ |
| 8 Assessment engine | 4 × 100-mark exams, randomization, reports, history, 75% rule | ✅ |
| 9 Agent orchestration | LangGraph orchestrator, 9 specialists, provider abstraction, fallback | ✅ |
| 10 Persistence & progress | Skill scores, mistakes, streaks, achievements, progress page | ✅ |
| 11 PWA & iOS | Manifest, ngsw, offline page, iOS meta + safe areas, install guide, update banner | ✅ (real-device testing pending) |
| 12 Security, tests, deploy | Rate limit, headers, unit/integration/e2e, Dockerfiles | ✅ (partial — see gaps) |

## Testing strategy

| Level | Tool | Scope |
|---|---|---|
| Unit (API) | Vitest | SRS intervals, exam scoring & 75% rule, rules evaluator, daily-plan builder, validation schemas |
| Integration (API) | Vitest + real Postgres (`fluentpath_test`) | auth flow, onboarding → Day 1, submit activity → scores/mistakes/revision rows, data isolation between users |
| Unit (agent) | pytest | routing picks exactly one specialist, validation rejects bad output, fallback on provider error, rules evaluator |
| E2E | Playwright (Chromium; mobile emulation iPhone 13 + Pixel 7) | register → onboarding → Day-1 session → submit writing → exam → logout/login persistence; no horizontal overflow at 320–1280 px |
| Accessibility | Playwright + axe-core (when available), manual keyboard pass | contrast, labels, focus order |
| Manual device | Real iPhone Safari + Android Chrome | Add to Home Screen, safe areas, mic permission, TTS voices, orientation |

## Known gaps / honest limitations

* **Real-device iOS testing** cannot be performed from CI; Playwright WebKit/iPhone emulation is a proxy. A manual checklist is in `docs/07-ios-checklist.md`.
* **Audio pronunciation scoring** needs an external speech-assessment service (e.g. Azure Speech Pronunciation Assessment). The adapter interface exists; with no key configured, the app shows guidance only and never reports a score.
* **LLM evaluation** requires Ollama or a cloud key. Without one, open answers are scored by the rule-based evaluator and labelled as such.
* **Seed content** covers Level 1 fully and Level 2 partially; higher levels rely on AI generation (`/v1/generate`) once a model is configured.
