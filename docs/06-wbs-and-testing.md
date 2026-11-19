# Implementation WBS, Testing Strategy & Checklist

## WBS — status after first delivery

| Phase | Deliverables | Status |
|---|---|---|
| 1 Setup & design system | Monorepo, docs, tokens (light/dark), inline icon set | ✅ Done |
| 2 Auth, onboarding, profile | Register/login, rotating refresh tokens, 5-step onboarding with spec defaults, settings | ✅ Done |
| 3 Dashboard & navigation | Bottom tab bar (mobile) / side rail (desktop), all dashboard widgets | ✅ Done |
| 4 Daily learning engine | 10-activity ~30 min plan, one at a time, pause/resume, no repeat of learned words, remedial grammar from weak areas | ✅ Done |
| 5 Read / Write / Speak / Lesson | Independent hubs + daily renderers; 42-topic 5-stage syllabus | ✅ Done (12 seed lessons; rest AI-generated on demand) |
| 6 Vocabulary, pronunciation, revision | 28 categories / 177 words with Tamil; listen→spell→meaning→sentence; SRS 0/1/3/7/14 days | ✅ Done (pronunciation = guidance only, no audio scoring) |
| 7 Technical English | Level-1 job patterns from Day 2, scenarios unlock at Level 2/3 | ✅ Done (3 seed scenarios) |
| 8 Assessment engine | 4 × 100-mark randomized exams, reports, history, 75% rule across all four | ✅ Done |
| 9 Agent orchestration | LangGraph orchestrator, 9 specialists, validation, retry, fallback, chat checkpoints | ✅ Done (not yet exercised against a live Ollama model) |
| 10 Persistence & progress | Skill scores, mistakes, streaks, achievements, progress page | ✅ Done |
| 11 PWA & iOS | Manifest, icons, ngsw, offline page, update banner, safe areas, install guide | ✅ Done; real-device iOS testing still to do |
| 12 Security, tests, deploy | Rate limits, headers, validation, account deletion; 33 API + 15 agent + 13 e2e tests; Dockerfiles | 🟡 Partial: Docker images unbuilt, no CI pipeline, no axe-core audit yet |

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
