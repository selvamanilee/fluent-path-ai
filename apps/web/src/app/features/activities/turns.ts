import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ActivityBase } from './base';
import { SpeakButton } from '../../shared/speak-button';
import { Feedback } from '../../shared/corrections';
import { AnswerInput } from '../../shared/answer-input';
import { ProgressBar } from '../../shared/progress-bar';
import { ScoreBanner } from '../../shared/item-results';
import { Icon } from '../../shared/icon';
import { Speech } from '../../core/speech.service';
import { Evaluation, TurnQ, TurnResult } from '../../core/models';

export type TurnFn = (index: number, transcript: string, inputMode: 'text' | 'voice') => Promise<TurnResult>;

/** Speaking / technical conversation: one question at a time, feedback, repeat, then next. */
@Component({
  selector: 'fp-turns-activity',
  imports: [SpeakButton, Feedback, AnswerInput, ProgressBar, ScoreBanner, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.bubble { border-radius: 22px 22px 22px 6px; padding: 16px; } .me { border-radius: 22px 22px 6px 22px; margin-left: 24px; background: var(--surface-2); padding: 14px 16px }`],
  template: `
  @let c = content();
  @if (finalScore() !== null) {
    <div class="stack">
      <fp-score-banner [score]="finalScore()!" label="Conversation score" />
      <p class="notice small">Fluency and grammar were assessed from your words. Pronunciation is not scored in conversations — use the Pronunciation trainer for listening and repeating.</p>
      <button class="btn btn-block btn-lg" type="button" (click)="finish()">{{ continueLabel() }}</button>
    </div>
  } @else {
    <div class="stack">
      @if (c.situation || c.intro) {
        <section class="card-2 stack-sm"><span class="eyebrow">{{ c.situation ? 'Situation' : 'Conversation' }}</span><p>{{ c.situation || c.intro }}</p>
          @if (c.key_terms?.length) { <p class="small">Key terms: @for (t of c.key_terms; track t.term; let last = $last) { <strong>{{ t.term }}</strong> ({{ t.meaning }})@if (!last) {, } }</p> }
        </section>
      }
      <div class="row-between"><span class="muted small">Question {{ index() + 1 }} of {{ questions().length }}</span>
        <span class="tag">{{ speech.canListen ? 'Speak or type' : 'Type your answer' }}</span></div>
      <fp-progress [value]="index()" [max]="questions().length" label="Conversation progress" />
      @let q = questions()[index()];
      <div class="card card-accent bubble stack-sm" aria-live="polite">
        <div class="row-between" style="align-items:flex-start"><p style="font-size:var(--t-lg);font-weight:600" class="break grow">{{ q.prompt }}</p><fp-speak [text]="q.prompt" /></div>
        @if (q.prompt_ta) { <p class="small ta" lang="ta" style="opacity:.85">{{ q.prompt_ta }}</p> }
      </div>
      @if (feedback(); as f) {
        <p class="me break">{{ lastAnswer() }}</p>
        <div class="card"><fp-feedback [evaluation]="f" /></div>
        <button class="btn btn-block btn-lg" type="button" (click)="advance()">{{ index() + 1 < questions().length ? 'Next question' : 'See my score' }}</button>
        <button class="link" type="button" style="align-self:center" (click)="retry()">Try this question again</button>
      } @else {
        <button class="pill" type="button" style="align-self:flex-start" [attr.aria-pressed]="hint()" (click)="hint.set(!hint())"><fp-icon name="bulb" [size]="18" /> {{ hint() ? 'Hide' : 'Show' }} sentence pattern</button>
        @if (hint()) { <p class="notice">Pattern: <strong>{{ q.pattern }}</strong></p> }
        <fp-answer label="Your answer" [voice]="true" [(value)]="answer" (mode)="mode = $event" (enter)="sendTurn()" placeholder="Say or type your answer" />
        @if (error()) { <p class="notice notice-bad" role="alert">{{ error() }}</p> }
        <button class="btn btn-block btn-lg" type="button" (click)="sendTurn()" [disabled]="busy() || !answer().trim()">{{ busy() ? 'Listening to your answer…' : 'Send answer' }}</button>
      }
    </div>
  }`,
})
export class TurnsActivity extends ActivityBase implements OnInit {
  speech = inject(Speech);
  turnFn = input.required<TurnFn>();
  questions = computed<TurnQ[]>(() => this.content().questions ?? []);
  index = signal(0);
  answer = signal('');
  lastAnswer = signal('');
  feedback = signal<Evaluation | null>(null);
  hint = signal(false);
  finalScore = signal<number | null>(null);
  mode: 'text' | 'voice' = 'text';
  private scores: number[] = [];

  ngOnInit() {
    const init: any = this.initialResult();
    if (init) { this.finalScore.set(init.score ?? 0); this.result.set(init); return; }
    const turns = this.content().__turns ?? {};
    const done = Object.keys(turns).map(Number);
    if (done.length) { this.index.set(Math.min(Math.max(...done) + 1, this.questions().length - 1)); this.scores = done.map(i => turns[i].evaluation.score); }
  }

  async sendTurn() {
    const t = this.answer().trim();
    if (!t || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      const r = await this.turnFn()(this.index(), t, this.mode);
      this.feedback.set(r.evaluation); this.lastAnswer.set(t);
      this.scores[this.index()] = r.evaluation.score;
      if (r.summary) this.summaryScore = r.summary.score;
    } catch (e: any) { this.error.set(e?.message ?? 'Could not send your answer.'); }
    finally { this.busy.set(false); }
  }
  private summaryScore: number | null = null;

  retry() { this.feedback.set(null); this.answer.set(''); }
  async advance() {
    this.feedback.set(null); this.answer.set(''); this.hint.set(false); this.mode = 'text';
    if (this.index() + 1 < this.questions().length) { this.index.update(i => i + 1); return; }
    // Last question: daily activities submit to save the result; practice hubs already saved via the turn.
    this.busy.set(true);
    try {
      const r = await this.submitFn()([]);
      this.result.set(r);
      this.finalScore.set(r?.score ?? this.summaryScore ?? Math.round(this.scores.reduce((a, b) => a + b, 0) / this.questions().length));
    } catch (e: any) { this.error.set(e?.message ?? 'Could not save.'); }
    finally { this.busy.set(false); }
  }
  finish() { this.finished.emit(this.result()); }
}
