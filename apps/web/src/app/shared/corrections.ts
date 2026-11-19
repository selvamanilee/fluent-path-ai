import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Evaluation } from '../core/models';
import { SpeakButton } from './speak-button';

/** Original → corrected → why → natural / professional versions. Rendered as text only. */
@Component({
  selector: 'fp-feedback',
  imports: [SpeakButton, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .orig { text-decoration: line-through; text-decoration-color: var(--bad); color: var(--muted); }
    .fixed { color: var(--ok); font-weight: 600; }
    .score { font-size: 32px; font-weight: 700; }
    .item { border-left: 3px solid var(--accent); padding-left: 12px; }
  `],
  template: `
  @let e = evaluation();
  <section class="stack" aria-live="polite">
    <div class="row-between">
      <div class="row"><span class="score">{{ e.score | number: '1.0-0' }}</span><span class="muted">/ 100</span></div>
      <span class="tag" [class.tag-accent]="e.evaluator === 'llm'" [title]="e.evaluator === 'llm' ? 'Checked by the AI tutor' : 'AI tutor offline: checked with grammar rules'">
        {{ e.evaluator === 'llm' ? 'AI tutor feedback' : 'Rule-based check' }}</span>
    </div>
    @if (e.feedback) { <p>{{ e.feedback }}</p> }
    @if (e.corrections.length) {
      <div class="stack-sm">
        <h3 class="small eyebrow">Corrections</h3>
        @for (c of e.corrections.slice(0, 6); track $index) {
          <div class="item stack-sm">
            <p class="orig break">{{ c.original }}</p>
            <p class="fixed break">{{ c.corrected }}</p>
            <p class="small">{{ c.explanation }}</p>
            @if (c.explanation_ta && tamil()) { <p class="small muted ta" lang="ta">{{ c.explanation_ta }}</p> }
          </div>
        }
      </div>
    }
    @if (e.natural_version && e.corrections.length) {
      <div class="card-2 stack-sm"><div class="row-between"><span class="eyebrow">Natural English</span><fp-speak [text]="e.natural_version" [size]="40" /></div><p class="break">{{ e.natural_version }}</p></div>
    }
    @if (e.professional_version) {
      <div class="card-2 stack-sm"><div class="row-between"><span class="eyebrow">Professional / model answer</span><fp-speak [text]="e.professional_version" [size]="40" /></div><p class="break">{{ e.professional_version }}</p></div>
    }
    @if (e.repeat_practice) { <p class="notice">🔁 {{ e.repeat_practice }}</p> }
  </section>`,
})
export class Feedback {
  evaluation = input.required<Evaluation>();
  tamil = input(true);
}
