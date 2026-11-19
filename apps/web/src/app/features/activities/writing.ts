import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { ActivityBase } from './base';
import { Feedback } from '../../shared/corrections';
import { AnswerInput } from '../../shared/answer-input';
import { Evaluation } from '../../core/models';

@Component({
  selector: 'fp-writing-activity',
  imports: [Feedback, AnswerInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let c = content();
  <div class="stack">
    <section class="card stack-sm">
      <span class="eyebrow">Writing task</span><h2 class="break">{{ c.topic }}</h2>
      <p>{{ c.instructions }}</p><p class="small muted ta" lang="ta">{{ c.instructions_ta }}</p>
    </section>
    @if (result(); as r) {
      <div class="card stack-sm"><span class="eyebrow">You wrote</span><p class="break" style="white-space:pre-wrap">{{ text() }}</p></div>
      <div class="card"><fp-feedback [evaluation]="r" /></div>
      @if (r.reference && r.reference !== r.professional_version) { <div class="card-2 stack-sm"><span class="eyebrow">Example answer</span><p class="break">{{ r.reference }}</p></div> }
      <button class="btn btn-block btn-lg" type="button" (click)="next()">{{ continueLabel() }}</button>
    } @else {
      <div class="card stack">
        <fp-answer label="Write your answer" [multiline]="true" [rows]="6" [voice]="true" [(value)]="text" (valueChange)="draftChange.emit({ text: $event })" placeholder="Start with a simple sentence…" (enter)="submit()" />
        <p class="kbd-hint">{{ sentenceCount() }} sentence{{ sentenceCount() === 1 ? '' : 's' }} · aim for at least {{ c.min_sentences }}</p>
        @if (error()) { <p class="notice notice-bad" role="alert">{{ error() }}</p> }
        <button class="btn btn-block btn-lg" type="button" (click)="submit()" [disabled]="busy() || !text().trim()">{{ busy() ? 'Checking your writing…' : 'Check my writing' }}</button>
      </div>
    }
  </div>`,
})
export class WritingActivity extends ActivityBase<Evaluation & { reference?: string }> implements OnInit {
  text = signal('');
  sentenceCount = computed(() => (this.text().match(/[^.!?\n]+[.!?]?/g) ?? []).filter(s => s.trim().length > 2).length);
  ngOnInit() {
    const init: any = this.initialResult();
    if (init) { this.result.set(init.evaluation ?? init); this.text.set(init.text ?? ''); }
    else this.text.set(this.draft()?.text ?? '');
  }
  submit() { if (this.text().trim()) this.send({ text: this.text() }); }
}
