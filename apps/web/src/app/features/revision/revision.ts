import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api.service';
import { ErrorView, Loading, Empty } from '../../shared/state-view';

const STAGES = ['Today', '1 day', '3 days', '7 days', '14 days', 'Mastered'];

@Component({
  selector: 'fp-revision',
  imports: [DatePipe, FormsModule, Loading, ErrorView, Empty],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="page stack-lg">
    <div class="stack-sm"><h1>Revision</h1><p class="muted">Spaced repetition: items come back after the same day, 1, 3, 7 and 14 days. Mistakes are revised first.</p></div>
    @if (error()) { <fp-error [message]="error()" (retry)="load()" /> }
    @else if (!data()) { <fp-loading /> }
    @else {
      <div class="pills">@for (s of data().stages; track s.stage) { <span class="pill" style="cursor:default">{{ stages[s.stage] }}: {{ s.n }}</span> }</div>
      @if (idx() < data().items.length) {
        @let it = data().items[idx()];
        <div class="card stack">
          <div class="row-between"><span class="eyebrow">{{ it.type }} · {{ idx() + 1 }} of {{ data().items.length }}</span><span class="tag">Stage: {{ stages[it.stage] }}</span></div>
          <p style="font-size:var(--t-lg);font-weight:600" class="break" id="rv">{{ it.prompt }}</p>
          @if (it.options.length) {
            <div class="options" role="radiogroup" aria-labelledby="rv">@for (o of it.options; track o) { <button class="option" type="button" role="radio" [disabled]="!!fb()" [attr.aria-checked]="answer === o" [class.correct]="fb() && o === fb()!.expected" [class.wrong]="fb() && answer === o && !fb()!.correct" (click)="answer = o; check(it.id)">{{ o }}</button> }</div>
          } @else {
            <input class="input" aria-labelledby="rv" [(ngModel)]="answer" [disabled]="!!fb()" (keydown.enter)="check(it.id)" autocomplete="off" autocapitalize="sentences" />
            @if (it.type === 'mistake' && it.hint && !fb()) { <p class="kbd-hint">Hint: {{ it.hint }}</p> }
            @if (!fb()) { <button class="btn btn-block" type="button" (click)="check(it.id)" [disabled]="busy() || !answer.trim()">Check</button> }
          }
          @if (fb(); as f) {
            <p class="notice" [class.notice-ok]="f.correct" [class.notice-bad]="!f.correct" role="status">{{ f.correct ? 'Correct! Next review: ' : 'Answer: “' + f.expected + '”. It will come back soon. Next review: ' }}{{ f.nextDueAt | date: 'medium' }}</p>
            <button class="btn btn-block" type="button" (click)="nextItem()">Next</button>
          }
        </div>
      } @else {
        <fp-empty icon="check" title="All caught up!" [message]="data().items.length ? 'You finished every due item. Well done.' : 'Nothing is due right now. Learn new words in today’s session — they will come back here.'" />
      }
      @if (data().upcoming.length) {
        <section class="card stack-sm"><h3>Coming up</h3>@for (u of data().upcoming; track u.date) { <div class="row-between small"><span>{{ u.date | date: 'EEE, d MMM' }}</span><span>{{ u.n }} item{{ u.n > 1 ? 's' : '' }}</span></div> }</section>
      }
    }
  </div>`,
})
export class Revision implements OnInit {
  private api = inject(Api);
  stages = STAGES;
  data = signal<any>(null);
  error = signal('');
  idx = signal(0);
  answer = '';
  busy = signal(false);
  fb = signal<{ correct: boolean; expected: string; nextDueAt: string } | null>(null);
  ngOnInit() { this.load(); }
  async load() { this.error.set(''); try { this.data.set(await this.api.get('/revision/due')); this.idx.set(0); } catch (e: any) { this.error.set(e.message); } }
  async check(id: string) {
    if (!this.answer.trim() || this.busy() || this.fb()) return;
    this.busy.set(true);
    try { this.fb.set(await this.api.post(`/revision/${id}/review`, { answer: this.answer })); }
    catch (e: any) { this.error.set(e.message); }
    finally { this.busy.set(false); }
  }
  nextItem() { this.fb.set(null); this.answer = ''; this.idx.update(i => i + 1); }
}
