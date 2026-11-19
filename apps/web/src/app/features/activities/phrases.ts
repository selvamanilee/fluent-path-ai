import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivityBase } from './base';
import { SpeakButton } from '../../shared/speak-button';
import { Feedback } from '../../shared/corrections';
import { ScoreBanner } from '../../shared/item-results';

@Component({
  selector: 'fp-phrases-activity',
  imports: [FormsModule, SpeakButton, Feedback, ScoreBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @if (result(); as r) {
    <div class="stack">
      <fp-score-banner [score]="r.score" />
      @for (it of r.items; track $index) {
        <div class="card stack-sm"><p><strong>{{ it.phrase }}</strong></p><p class="small muted">{{ it.prompt }}</p><p class="small break">You wrote: “{{ it.yourAnswer || '—' }}”</p><fp-feedback [evaluation]="it.evaluation" /></div>
      }
      <button class="btn btn-block btn-lg" type="button" (click)="next()">{{ continueLabel() }}</button>
    </div>
  } @else {
    <form class="stack" (ngSubmit)="send(answers)">
      @for (p of content().items; track p.id; let i = $index) {
        <article class="card stack-sm">
          <div class="row-between" style="align-items:flex-start"><h3 class="break grow">{{ p.text }}</h3><fp-speak [text]="p.text" /></div>
          <p class="small muted">{{ p.pronunciation }}</p>
          <p>{{ p.meaning }}</p>
          <p class="ta muted" lang="ta">{{ p.meaning_ta }}</p>
          <div class="card-2 stack-sm"><span class="eyebrow">When to use it</span><p class="small">{{ p.situation }}</p><p class="small break"><em>“{{ p.example }}”</em></p></div>
          <div class="field"><label [for]="'p' + i">{{ p.practice_question }}</label>
            <input class="input" [id]="'p' + i" [name]="'p' + i" [(ngModel)]="answers[i]" (ngModelChange)="draftChange.emit({ answers })" autocapitalize="sentences" autocomplete="off" /></div>
        </article>
      }
      @if (error()) { <p class="notice notice-bad" role="alert">{{ error() }}</p> }
      <button class="btn btn-block btn-lg" type="submit" [disabled]="busy() || !filled()">{{ busy() ? 'Checking…' : 'Check my answers' }}</button>
      @if (!filled()) { <p class="kbd-hint center">Answer each practice question in your own words.</p> }
    </form>
  }`,
})
export class PhrasesActivity extends ActivityBase implements OnInit {
  answers: string[] = [];
  ngOnInit() { if (this.initialResult()) this.result.set(this.initialResult()); this.answers = this.draft()?.answers ?? []; }
  filled() { return (this.content().items ?? []).every((_: any, i: number) => (this.answers[i] ?? '').trim().length > 0); }
}
