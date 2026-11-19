# Frontend Module Structure (`apps/web`)

Angular 22, standalone components, zoneless change detection, signals for state, lazy-loaded routes.

```
src/
  styles.scss                 design tokens (light/dark), safe-area, base elements
  app/
    app.config.ts             router, http (auth interceptor), service worker
    app.routes.ts             lazy routes + authGuard / onboardedGuard
    core/
      api.service.ts          typed HTTP client for /api/v1 (envelope unwrapping, errors)
      auth.service.ts         login/register/refresh/logout, access token in memory
      auth.interceptor.ts     Bearer header + single-flight refresh on 401
      guards.ts               authGuard, onboardedGuard, guestGuard
      models.ts               shared request/response types (mirror of API zod schemas)
      speech.service.ts       Web Speech API wrapper (TTS + STT) with capability detection
      pwa.service.ts          install prompt (Android/desktop), iOS detection, SW update banner
      theme.service.ts        light / dark / system
    shared/
      progress-bar.ts         accessible <div role=progressbar>
      icon.ts                 inline SVG icon set (no icon font: works offline)
      correction-list.ts      original → corrected → why → natural/professional
      state-views.ts          loading / empty / error blocks
      result-badge.ts         "AI feedback" vs "Rule-based feedback" label
    layout/
      shell.ts                bottom tab bar (mobile) / side rail (≥ 900px)
    features/
      welcome/                splash, login, register
      onboarding/             5-step wizard (profile, goals, modules intro)
      dashboard/              widgets
      daily/                  daily session player (one activity at a time, pause/resume)
      activities/             renderers: vocab, phrases, grammar, reading, writing, speaking, technical, revision, mini-exam
      read/ write/ speak/     module hubs (level → exercise list → exercise)
      lesson/                 5-stage grammar syllabus + lesson page
      vocabulary/             category library + word card + practice
      pronunciation/          listen / repeat / record / syllables
      technical/              scenario list + scenario practice
      exams/                  exam picker, exam runner, report
      progress/               charts, skill breakdown, mistakes
      revision/               due queue (spaced repetition)
      settings/               profile, preferences, install guide, data deletion
```

### UI/UX screen list

| # | Screen | Route | Notes |
|---|---|---|---|
| 1 | Welcome / splash | `/welcome` | "Empower your English" hero, Start |
| 2 | Register / Login | `/register`, `/login` | Reactive forms, visible labels, blur validation |
| 3 | Onboarding wizard (5 steps) | `/onboarding` | Defaults pre-filled from spec profile |
| 4 | Dashboard | `/` | Greeting, level, day, streak, today ring, 4 skill cards, vocab preview, grammar, revision, mini-exam, weekly chart, time, achievements |
| 5 | Daily session player | `/daily` | One activity at a time; progress header; pause/resume |
| 6 | Read hub / exercise | `/read`, `/read/:id` | Passage, words, sentence meanings, 5 Qs, score |
| 7 | Write hub / exercise | `/write`, `/write/:id` | Topic → free answer → corrections |
| 8 | Speak hub / conversation | `/speak`, `/speak/:id` | One question at a time, mic where supported |
| 9 | Lesson syllabus / lesson | `/lesson`, `/lesson/:slug` | 5 stages, Tamil toggle, practice |
| 10 | Vocabulary library / category / practice | `/vocabulary`, `/vocabulary/:slug` | Flip cards, listen, spell, sentence |
| 11 | Pronunciation | `/pronunciation` | Listen, repeat, record (where supported), syllables |
| 12 | Technical English | `/technical`, `/technical/:id` | Locked until level 2 (no tech on Day 1) |
| 13 | Exams / runner / report | `/exams`, `/exams/:attemptId`, `/exams/:attemptId/report` | 4 × 100-mark exams |
| 14 | Progress | `/progress` | Skill bars, weekly chart, mistakes |
| 15 | Revision queue | `/revision` | Due items by SRS stage |
| 16 | Settings | `/settings` | Profile, prefs, theme, install guide, export/delete |
| 17 | Offline fallback | `offline.html` | Served by SW when navigation fails offline |
