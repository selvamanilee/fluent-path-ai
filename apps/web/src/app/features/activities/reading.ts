import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { ActivityBase } from './base';
import { SpeakButton } from '../../shared/speak-button';
import { ItemResults, ScoreBanner } from '../../shared/item-results';

@Component({
  selector: 'fp-reading-activity',
  imports: [SpeakButton, ItemResults, ScoreBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.passage { font-size: 19px; line-height: 1.7 } dl { margin:0; display:grid; gap:8px } dt { font-weight:600 } dd { margin:0 }`],
  template: `
  @let c = content();
  @if (result(); as r) {
    <div class="stack"><fp-score-banner [score]="r.score" label="Reading score" /><fp-item-results [items]="r.items" />
      <button class="btn btn-block btn-lg" type="button" (click)="next()">{{ continueLabel() }}</button></div>
  } @else {
    <div class="stack">
      <article class="card stack">
        <div class="row-between"><h2 class="break">{{ c.title }}</h2><fp-speak [text]="c.body" [rate]="0.85" /></div>
        <p class="passage break">{{ c.body }}</p>
      </article>
      <section class="card stack-sm"><h3>Difficult words</h3>
        <dl>@for (w of c.difficult_words; track w.word) { <div class="card-2"><dt>{{ w.word }}</dt><dd class="small">{{ w.meaning }} · <span class="ta" lang="ta">{{ w.meaning_ta }}</span></dd></div> }</dl>
      </section>
      <section class="card stack-sm">
        <div class="row-between"><h3>Sentence by sentence</h3><button class="pill" type="button" [attr.aria-pressed]="showMeanings()" (click)="showMeanings.set(!showMeanings())">{{ showMeanings() ? 'Hide' : 'Show' }} Tamil</button></div>
        @if (showMeanings()) {
          <ol class="stack-sm" style="margin:0;padding-left:20px">@for (s of c.sentence_meanings; track $index) { <li><p class="break">{{ s.sentence }}</p><p class="small muted ta break" lang="ta">{{ s.meaning_ta }}</p></li> }</ol>
        } @else { <p class="small muted">Try to understand the passage first. Then check the Tamil meaning of each sentence.</p> }
      </section>
      <section class="card stack">
        <h3>Questions</h3>
        @for (q of c.questions; track $index; let i = $index) {
          <div class="stack-sm"><p id="rq{{ i }}"><strong>{{ i + 1 }}.</strong> {{ q.prompt }}</p>
            <div class="options" role="radiogroup" [attr.aria-labelledby]="'rq' + i">
              @for (o of q.options; track o) { <button type="button" class="option" role="radio" [attr.aria-checked]="answers()[i] === o" (click)="pick(i, o)">{{ o }}</button> }
            </div></div>
        }
        @if (error()) { <p class="notice notice-bad" role="alert">{{ error() }}</p> }
        <button class="btn btn-block btn-lg" type="button" (click)="send(answers())" [disabled]="busy() || answeredCount() < c.questions.length">{{ busy() ? 'Checking…' : 'Check my answers' }}</button>
      </section>
    </div>
  }`,
})
export class ReadingActivity extends ActivityBase implements OnInit {
  showMeanings = signal(false);
  answers = signal<string[]>([]);
  answeredCount = () => this.answers().filter(a => !!a).length;
  ngOnInit() { if (this.initialResult()) this.result.set(this.initialResult()); this.answers.set(this.draft()?.answers ?? []); }
  pick(i: number, o: string) { const a = [...this.answers()]; a[i] = o; this.answers.set(a); this.draftChange.emit({ answers: a }); }
}
