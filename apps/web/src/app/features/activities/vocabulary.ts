import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivityBase } from './base';
import { SpeakButton } from '../../shared/speak-button';
import { Icon } from '../../shared/icon';
import { ProgressBar } from '../../shared/progress-bar';
import { ItemResults, ScoreBanner } from '../../shared/item-results';
import { Feedback } from '../../shared/corrections';
import { Speech } from '../../core/speech.service';
import { Word } from '../../core/models';

@Component({
  selector: 'fp-vocab-activity',
  imports: [FormsModule, SpeakButton, Icon, ProgressBar, ItemResults, ScoreBanner, Feedback],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.word { font-size: 40px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1 }
    .repeat { display:flex; gap:8px } .dot { width: 14px; height: 14px; border-radius: 99px; background: rgba(255,255,255,.3) } .dot.on { background:#fff }`],
  template: `
  @if (result(); as r) {
    <div class="stack">
      <fp-score-banner [score]="r.score" />
      <fp-item-results [items]="r.items" />
      @for (s of r.sentences; track $index) { <div class="card-2 stack-sm"><p class="small">Sentence with “{{ s.word }}”: {{ s.text || '—' }}</p><fp-feedback [evaluation]="s.evaluation" /></div> }
      <button class="btn btn-block btn-lg" type="button" (click)="next()">{{ continueLabel() }}</button>
    </div>
  } @else if (step() < words().length) {
    @let w = words()[step()];
    <div class="stack">
      <div class="row-between"><span class="muted small">Word {{ step() + 1 }} of {{ words().length }}</span><span class="tag">{{ w.part_of_speech }}</span></div>
      <fp-progress [value]="step()" [max]="words().length" label="Words studied" />
      <article class="card card-accent stack" aria-live="polite">
        <div class="row-between" style="align-items:flex-start">
          <div class="stack-sm grow"><span class="word break">{{ w.word }}</span>
            <span>{{ w.ipa ? '/' + w.ipa + '/' : '' }} · <strong>{{ w.pronunciation }}</strong></span></div>
          <fp-speak [text]="w.word" [rate]="0.7" />
        </div>
        <p class="ta" lang="ta" style="font-size:22px">{{ w.meaning_ta }}</p>
        <p>{{ w.meaning_en }}</p>
        <div class="stack-sm">
          <span class="small" style="opacity:.85">Repeat it three times aloud</span>
          <div class="row"><div class="repeat" aria-hidden="true">@for (i of [0,1,2]; track i) { <span class="dot" [class.on]="repeats() > i"></span> }</div>
            <button type="button" class="btn btn-pink" style="min-height:40px;padding:8px 16px" (click)="repeat(w.word)" [attr.aria-label]="'I said it. Repeats: ' + repeats() + ' of 3'">I said it ({{ repeats() }}/3)</button></div>
        </div>
      </article>
      <div class="card stack-sm">
        <div class="row-between"><span class="eyebrow">Example</span><fp-speak [text]="w.example" [size]="40" /></div>
        <p class="break">{{ w.example }}</p><p class="small muted ta break" lang="ta">{{ w.example_ta }}</p>
        @if (w.synonym || w.antonym) { <p class="small">@if (w.synonym) {<span>Synonym: <strong>{{ w.synonym }}</strong></span>} @if (w.synonym && w.antonym) { · } @if (w.antonym) {<span>Opposite: <strong>{{ w.antonym }}</strong></span>}</p> }
      </div>
      <div class="row">
        <button class="btn btn-ghost" type="button" (click)="go(-1)" [disabled]="step() === 0" aria-label="Previous word"><fp-icon name="left" /></button>
        <button class="btn grow" type="button" (click)="go(1)">{{ step() === words().length - 1 ? 'Practice these words' : 'Next word' }}</button>
      </div>
    </div>
  } @else {
    <form class="stack" (ngSubmit)="submit()">
      <h3>Quick check</h3>
      @for (q of content().quiz; track q.wordId; let i = $index) {
        <fieldset class="card stack-sm" style="border:0;margin:0">
          <legend class="ta" lang="ta" style="padding:0 0 8px;font-weight:600">{{ q.prompt }}</legend>
          <div class="options" role="radiogroup">
            @for (o of q.options; track o) {
              <button type="button" class="option" role="radio" [attr.aria-checked]="quiz()[i] === o" (click)="pick(i, o)">{{ o }}</button>
            }
          </div>
        </fieldset>
      }
      <h3>Make your own sentences</h3>
      @for (t of content().sentenceTasks; track t.wordId; let i = $index) {
        <div class="field"><label [for]="'s' + i">{{ t.prompt }}</label>
          <input class="input" [id]="'s' + i" [name]="'s' + i" [(ngModel)]="sentences[i]" autocapitalize="sentences" autocomplete="off" /></div>
      }
      @if (error()) { <p class="notice notice-bad" role="alert">{{ error() }}</p> }
      <button class="btn btn-block btn-lg" type="submit" [disabled]="busy() || !ready()">{{ busy() ? 'Checking…' : 'Check my answers' }}</button>
      @if (!ready()) { <p class="kbd-hint center">Answer every question to continue.</p> }
      <button class="link" type="button" (click)="step.set(0)" style="align-self:center">Review the words again</button>
    </form>
  }`,
})
export class VocabActivity extends ActivityBase implements OnInit {
  private speech = inject(Speech);
  words = computed<Word[]>(() => this.content().words ?? []);
  step = signal(0);
  repeats = signal(0);
  quiz = signal<string[]>([]);
  sentences: string[] = [];
  ready = computed(() => (this.content().quiz ?? []).every((_: any, i: number) => !!this.quiz()[i]));

  ngOnInit() {
    if (this.initialResult()) this.result.set(this.initialResult());
    const d = this.draft();
    if (d) { this.step.set(d.step ?? 0); this.quiz.set(d.quiz ?? []); this.sentences = d.sentences ?? []; }
  }
  go(n: number) { this.step.update(s => Math.max(0, s + n)); this.repeats.set(0); this.draftChange.emit({ step: this.step(), quiz: this.quiz(), sentences: this.sentences }); }
  repeat(word: string) { if (this.repeats() < 3) { this.repeats.update(r => r + 1); if (this.repeats() < 3) this.speech.say(word, 0.7); } }
  pick(i: number, o: string) { const q = [...this.quiz()]; q[i] = o; this.quiz.set(q); }
  submit() { if (this.ready()) this.send({ quiz: this.quiz(), sentences: this.sentences }); }
}
