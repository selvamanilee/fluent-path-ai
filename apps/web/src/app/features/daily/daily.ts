import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Api } from '../../core/api.service';
import { Activity, LearningDay } from '../../core/models';
import { Icon } from '../../shared/icon';
import { ProgressBar } from '../../shared/progress-bar';
import { ErrorView, Loading } from '../../shared/state-view';
import { VocabActivity } from '../activities/vocabulary';
import { PhrasesActivity } from '../activities/phrases';
import { LessonActivity } from '../activities/lesson';
import { ReadingActivity } from '../activities/reading';
import { WritingActivity } from '../activities/writing';
import { TurnsActivity } from '../activities/turns';
import { QuizActivity } from '../activities/quiz';

const ICON: Record<string, string> = { vocabulary: 'bookmark', phrases: 'chat', phrasal_verbs: 'sparkle', grammar: 'cap', speaking: 'mic', reading: 'book', writing: 'pen', technical: 'code', revision: 'repeat', mini_exam: 'award' };

/** Daily session player: one activity at a time, with pause / resume (state is saved on the server). */
@Component({
  selector: 'fp-daily',
  imports: [RouterLink, DecimalPipe, Icon, ProgressBar, Loading, ErrorView, VocabActivity, PhrasesActivity, LessonActivity, ReadingActivity, WritingActivity, TurnsActivity, QuizActivity],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    header { position: sticky; top: 0; z-index: 10; background: var(--bg); padding: calc(10px + var(--safe-top)) 0 10px; }
    .list a { display: grid; grid-template-columns: 44px 1fr auto; gap: 12px; align-items: center; text-decoration: none; color: inherit; padding: 10px; border-radius: 18px; background: var(--surface); }
    .list .ic { width: 44px; height: 44px; border-radius: 999px; display: grid; place-items: center; background: var(--surface-2) }
    .list .done .ic { background: var(--ok-soft); color: var(--ok) }
    .list .current { outline: 2px solid var(--accent) }
  `],
  template: `
  <div class="page stack" style="padding-top:0">
    <header class="stack-sm">
      <div class="row">
        <button class="icon-btn" type="button" (click)="pause()" aria-label="Pause and close"><fp-icon name="x" /></button>
        <div class="grow"><fp-progress [value]="doneCount()" [max]="day()?.activities?.length ?? 10" label="Activities completed today" /></div>
        <span class="small muted" aria-live="polite">{{ doneCount() }}/{{ day()?.activities?.length ?? 0 }}</span>
      </div>
    </header>

    @if (error()) { <fp-error [message]="error()" (retry)="load()" /> }
    @else if (!day()) { <fp-loading /> }
    @else if (overview()) {
      @let d = day()!;
      <div class="stack-sm"><span class="eyebrow">Day {{ d.day.day_number }}</span><h1 class="break">{{ d.day.title }}</h1>
        <p class="muted">{{ d.day.status === 'completed' ? 'You finished today’s plan. Come back tomorrow, or review any activity.' : 'About 30 minutes. One activity at a time — you can pause anytime and continue later.' }}</p></div>
      <div class="stack-sm list" role="list">
        @for (a of d.activities; track a.id; let i = $index) {
          <a role="listitem" href="" (click)="$event.preventDefault(); open(i)" [class.done]="a.status === 'done'" [class.current]="i === d.currentIndex && d.day.status !== 'completed'">
            <span class="ic"><fp-icon [name]="a.status === 'done' ? 'check' : icon[a.kind]" /></span>
            <span class="stack-sm" style="gap:0"><strong class="break">{{ a.title }}</strong><span class="xs muted">{{ a.minutes }} min{{ a.status === 'in_progress' ? ' · in progress' : '' }}</span></span>
            <span class="small">{{ a.status === 'done' ? (a.score | number: '1.0-0') + '%' : '' }}</span>
          </a>
        }
      </div>
      @if (d.day.status === 'completed') {
        <div class="card card-accent stack-sm center"><span class="big-number">🎉</span><h2>Day {{ d.day.day_number }} complete</h2><p>Your progress is saved. Revision items will appear when they are due.</p></div>
        <a class="btn btn-lg btn-block" routerLink="/">Back to dashboard</a>
      } @else {
        <button class="btn btn-lg btn-block" type="button" (click)="open(d.currentIndex)">{{ doneCount() ? 'Continue' : 'Start' }}: {{ d.activities[d.currentIndex].title }}</button>
      }
    } @else {
      @let a = current()!;
      <div class="row-between"><span class="eyebrow">{{ a.seq }} · {{ a.minutes }} min</span>
        <button class="link small" type="button" (click)="overview.set(true)">All activities</button></div>
      <h1 class="break" style="font-size:var(--t-xl)">{{ a.title }}</h1>
      @switch (a.kind) {
        @case ('vocabulary') { <fp-vocab-activity [content]="a.content" [draft]="a.state?.draft" [initialResult]="done(a)" [submitFn]="submitFn(a)" (finished)="advance()" (draftChange)="saveDraft(a, $event)" /> }
        @case ('phrases') { <fp-phrases-activity [content]="a.content" [draft]="a.state?.draft" [initialResult]="done(a)" [submitFn]="submitFn(a)" (finished)="advance()" (draftChange)="saveDraft(a, $event)" /> }
        @case ('phrasal_verbs') { <fp-phrases-activity [content]="a.content" [draft]="a.state?.draft" [initialResult]="done(a)" [submitFn]="submitFn(a)" (finished)="advance()" (draftChange)="saveDraft(a, $event)" /> }
        @case ('grammar') { <fp-lesson-activity [content]="lessonContent(a)" [draft]="a.state?.draft" [initialResult]="done(a)" [submitFn]="submitFn(a)" (finished)="advance()" (draftChange)="saveDraft(a, $event)" /> }
        @case ('reading') { <fp-reading-activity [content]="a.content" [draft]="a.state?.draft" [initialResult]="done(a)" [submitFn]="submitFn(a)" (finished)="advance()" (draftChange)="saveDraft(a, $event)" /> }
        @case ('writing') { <fp-writing-activity [content]="a.content" [draft]="a.state?.draft" [initialResult]="done(a)" [submitFn]="writingSubmit(a)" (finished)="advance()" (draftChange)="saveDraft(a, $event)" /> }
        @case ('speaking') { <fp-turns-activity [content]="turnContent(a)" [initialResult]="done(a)" [submitFn]="submitFn(a)" [turnFn]="turnFn(a)" (finished)="advance()" /> }
        @case ('technical') { <fp-turns-activity [content]="turnContent(a)" [initialResult]="done(a)" [submitFn]="submitFn(a)" [turnFn]="turnFn(a)" (finished)="advance()" /> }
        @case ('revision') { <fp-quiz-activity [content]="{ items: a.content.items, intro: 'Revise what you learned before. Spaced revision helps you remember.' }" [initialResult]="done(a)" [submitFn]="submitFn(a)" (finished)="advance()" /> }
        @case ('mini_exam') { <fp-quiz-activity [content]="{ questions: a.content.questions, intro: 'A small test on today’s content. Target: 75%.' }" [initialResult]="done(a)" [submitFn]="submitFn(a)" continueLabel="Finish today" (finished)="advance()" /> }
      }
    }
  </div>`,
})
export class Daily implements OnInit, OnDestroy {
  private api = inject(Api);
  private router = inject(Router);
  icon = ICON;
  day = signal<LearningDay | null>(null);
  error = signal('');
  index = signal(0);
  overview = signal(true);
  current = computed(() => this.day()?.activities[this.index()] ?? null);
  doneCount = computed(() => this.day()?.activities.filter(a => a.status === 'done').length ?? 0);
  private started = Date.now();
  private draftTimer: any;
  private fnCache = new Map<string, any>();

  ngOnInit() { this.load(); }
  ngOnDestroy() { this.flushDraft(); }

  async load() {
    this.error.set('');
    try {
      const d = await this.api.get<LearningDay>('/daily/today');
      this.day.set(d); this.index.set(d.currentIndex);
    } catch (e: any) {
      if (e.code === 'ONBOARDING_REQUIRED') { this.router.navigateByUrl('/onboarding'); return; }
      this.error.set(e.message);
    }
  }

  open(i: number) { this.index.set(i); this.overview.set(false); this.started = Date.now(); window.scrollTo({ top: 0 }); }
  done(a: Activity) { return a.status === 'done' ? { ...a.result, score: a.score } : null; }
  lessonContent(a: Activity) { return a.content; }
  turnContent(a: Activity) { return { ...a.content, __turns: a.state?.turns ?? {} }; }

  private elapsed() { return Math.round((Date.now() - this.started) / 1000); }

  submitFn(a: Activity) {
    return this.cached('s' + a.id, () => async (answers: any) => {
      const r: any = await this.api.post(`/daily/activities/${a.id}/submit`, { answers, elapsedSeconds: this.elapsed() });
      this.markDone(a.id, r);
      return { ...r.result, score: r.score };
    });
  }
  writingSubmit(a: Activity) {
    return this.cached('w' + a.id, () => async (answers: any) => {
      const r: any = await this.api.post(`/daily/activities/${a.id}/submit`, { answers, elapsedSeconds: this.elapsed() });
      this.markDone(a.id, r);
      return r.result.evaluation;
    });
  }
  turnFn(a: Activity) {
    return this.cached('t' + a.id, () => (index: number, transcript: string, inputMode: 'text' | 'voice') => this.api.post<any>(`/daily/activities/${a.id}/turn`, { index, transcript, inputMode }));
  }
  private cached<T>(k: string, make: () => T): T { if (!this.fnCache.has(k)) this.fnCache.set(k, make()); return this.fnCache.get(k); }

  private markDone(id: string, r: any) {
    const d = this.day()!;
    const activities = d.activities.map(x => (x.id === id ? { ...x, status: 'done' as const, score: r.score ?? x.score, result: r.result ?? x.result } : x));
    const next = activities.findIndex(x => x.status !== 'done');
    this.day.set({ ...d, activities, currentIndex: Math.max(0, next), day: { ...d.day, status: r.dayCompleted ? 'completed' : d.day.status } });
  }

  advance() {
    const d = this.day()!;
    const next = d.activities.findIndex(x => x.status !== 'done');
    if (next === -1) { this.overview.set(true); window.scrollTo({ top: 0 }); return; }
    this.open(next);
  }

  private pendingDraft: (() => Promise<unknown>) | null = null;
  saveDraft(a: Activity, state: any) {
    // Keep the local copy current so resuming in this session shows the draft immediately.
    const d = this.day()!;
    this.day.set({ ...d, activities: d.activities.map(x => (x.id === a.id ? { ...x, status: x.status === 'pending' ? 'in_progress' : x.status, state: { ...x.state, draft: state } } : x)) });
    clearTimeout(this.draftTimer);
    this.pendingDraft = () => this.api.put(`/daily/activities/${a.id}/state`, { state }).catch(() => {});
    this.draftTimer = setTimeout(() => this.flushDraft(), 800);
  }
  private flushDraft() { clearTimeout(this.draftTimer); const f = this.pendingDraft; this.pendingDraft = null; return f?.(); }

  pause() {
    this.flushDraft();
    if (!this.overview()) { this.overview.set(true); return; }
    this.router.navigateByUrl('/');
  }
}
