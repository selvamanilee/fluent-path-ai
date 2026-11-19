import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivityBase } from './base';
import { SpeakButton } from '../../shared/speak-button';
import { ItemResults, ScoreBanner } from '../../shared/item-results';

@Component({
  selector: 'fp-lesson-activity',
  imports: [FormsModule, SpeakButton, ItemResults, ScoreBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.rule { font-size: var(--t-lg); font-weight: 600 } ul.ex { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px }
    ul.ex li { display:flex; align-items:center; justify-content: space-between; gap: 8px; background: var(--surface-2); padding: 6px 6px 6px 14px; border-radius: 14px }`],
  template: `
  @let c = content();
  @if (result(); as r) {
    <div class="stack"><fp-score-banner [score]="r.score" /><fp-item-results [items]="r.items" />
      <button class="btn btn-block btn-lg" type="button" (click)="next()">{{ continueLabel() }}</button></div>
  } @else {
    <div class="stack">
      @if (c.remedial) { <p class="notice notice-warn">You made a few mistakes with this recently, so let's review it again.</p> }
      <section class="card stack">
        <span class="eyebrow">Stage {{ c.stage }} · {{ c.title }}</span>
        <p>{{ c.explanation }}</p>
        <div class="row"><button type="button" class="pill" [attr.aria-pressed]="showTa()" (click)="showTa.set(!showTa())">தமிழில் விளக்கம் (Tamil)</button></div>
        @if (showTa()) { <p class="ta notice" lang="ta">{{ c.explanation_ta }}</p> }
        <div class="card-accent card stack-sm" style="padding:16px;border-radius:18px"><span class="eyebrow" style="color:inherit;opacity:.8">Rule</span><p class="rule break">{{ c.rule }}</p></div>
      </section>
      <section class="card stack-sm"><h3>Basic examples</h3>
        <ul class="ex">@for (e of c.basic_examples; track e) { <li><span class="break">{{ e }}</span><fp-speak [text]="e" [size]="40" /></li> }</ul></section>
      <section class="card stack-sm"><h3>At work</h3>
        <ul class="ex">@for (e of c.professional_examples; track e) { <li><span class="break">{{ e }}</span><fp-speak [text]="e" [size]="40" /></li> }</ul></section>
      <form class="card stack" (ngSubmit)="send(answers)">
        <h3>Practice</h3>
        <p class="small muted">Try on your own first — answers are shown after you check.</p>
        @for (q of c.practice; track $index; let i = $index) {
          <div class="stack-sm">
            <p id="lq{{ i }}"><strong>{{ i + 1 }}.</strong> {{ q.prompt }}</p>
            @if (q.kind === 'mcq') {
              <div class="options" role="radiogroup" [attr.aria-labelledby]="'lq' + i">
                @for (o of q.options; track o) { <button type="button" class="option" role="radio" [attr.aria-checked]="answers[i] === o" (click)="answers[i] = o; changed()">{{ o }}</button> }
              </div>
            } @else {
              <input class="input" [name]="'lq' + i" [attr.aria-labelledby]="'lq' + i" [(ngModel)]="answers[i]" (ngModelChange)="changed()" autocomplete="off" autocapitalize="sentences" />
            }
          </div>
        }
        @if (error()) { <p class="notice notice-bad" role="alert">{{ error() }}</p> }
        <button class="btn btn-block btn-lg" type="submit" [disabled]="busy() || !filled()">{{ busy() ? 'Checking…' : 'Check my answers' }}</button>
      </form>
    </div>
  }`,
})
export class LessonActivity extends ActivityBase implements OnInit {
  showTa = signal(false);
  answers: string[] = [];
  ngOnInit() { if (this.initialResult()) this.result.set(this.initialResult()); this.answers = this.draft()?.answers ?? []; this.showTa.set(this.content().showTamil ?? false); }
  changed() { this.answers = [...this.answers]; this.draftChange.emit({ answers: this.answers }); }
  filled() { return (this.content().practice ?? []).every((_: any, i: number) => (this.answers[i] ?? '').trim().length > 0); }
}
