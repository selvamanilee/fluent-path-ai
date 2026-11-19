import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivityBase } from './base';
import { ItemResults, ScoreBanner } from '../../shared/item-results';

/** Revision and mini-exam: options (MCQ) or typed answers. */
@Component({
  selector: 'fp-quiz-activity',
  imports: [FormsModule, ItemResults, ScoreBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let qs = content().items ?? content().questions ?? [];
  @if (result(); as r) {
    <div class="stack"><fp-score-banner [score]="r.score" /><fp-item-results [items]="r.items" />
      <button class="btn btn-block btn-lg" type="button" (click)="next()">{{ continueLabel() }}</button></div>
  } @else if (!qs.length) {
    <div class="card-2 stack-sm center"><h3>Nothing to revise right now</h3><p class="muted small">Great — no items are due. New words you learn today will come back for revision.</p>
      <button class="btn" type="button" (click)="send([])" [disabled]="busy()">Continue</button></div>
  } @else {
    <div class="stack">
      @if (intro()) { <p class="muted">{{ intro() }}</p> }
      @for (q of qs; track $index; let i = $index) {
        <div class="card stack-sm">
          <p id="qq{{ i }}" class="break"><strong>{{ i + 1 }}.</strong> {{ q.prompt }}</p>
          @if (q.options?.length) {
            <div class="options" role="radiogroup" [attr.aria-labelledby]="'qq' + i">
              @for (o of q.options; track o) { <button type="button" class="option" role="radio" [attr.aria-checked]="answers()[i] === o" (click)="set(i, o)">{{ o }}</button> }
            </div>
          } @else {
            <input class="input" [attr.aria-labelledby]="'qq' + i" [ngModel]="answers()[i] ?? ''" (ngModelChange)="set(i, $event)" autocomplete="off" autocapitalize="sentences" />
            @if (q.hint) { <p class="kbd-hint">Hint: {{ q.hint }}</p> }
          }
        </div>
      }
      @if (error()) { <p class="notice notice-bad" role="alert">{{ error() }}</p> }
      <button class="btn btn-block btn-lg" type="button" (click)="send(answers())" [disabled]="busy() || answeredCount() < qs.length">{{ busy() ? 'Checking…' : 'Check my answers' }}</button>
    </div>
  }`,
})
export class QuizActivity extends ActivityBase implements OnInit {
  answers = signal<string[]>([]);
  answeredCount = () => this.answers().filter(a => !!a?.trim()).length;
  intro = signal('');
  ngOnInit() { if (this.initialResult()) this.result.set(this.initialResult()); this.answers.set(this.draft()?.answers ?? []); this.intro.set(this.content().intro ?? ''); }
  set(i: number, v: string) { const a = [...this.answers()]; a[i] = v; this.answers.set(a); this.draftChange.emit({ answers: a }); }
}
