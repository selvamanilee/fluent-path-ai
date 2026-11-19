import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ItemResult } from '../core/models';
import { Icon } from './icon';
import { Feedback } from './corrections';

@Component({
  selector: 'fp-item-results',
  imports: [Icon, Feedback],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <ol class="stack" style="list-style:none;padding:0;margin:0">
    @for (r of items(); track $index) {
      <li class="card-2 stack-sm">
        <div class="row" style="align-items:flex-start">
          <span [style.color]="r.correct ? 'var(--ok)' : 'var(--bad)'"><fp-icon [name]="r.correct ? 'check' : 'x'" /></span>
          <div class="grow stack-sm">
            <p class="break"><strong>{{ r.prompt }}</strong></p>
            @if (!r.evaluation) {
              <p class="small break">Your answer: <span [style.color]="r.correct ? 'var(--ok)' : 'var(--bad)'">{{ r.yourAnswer || '—' }}</span></p>
              @if (!r.correct && r.expected) { <p class="small break">Correct answer: <strong>{{ r.expected }}</strong></p> }
            }
            @if (r.explanation) { <p class="small muted break">{{ r.explanation }}</p> }
          </div>
        </div>
        @if (r.evaluation) { <p class="small break">You wrote: “{{ r.yourAnswer || '—' }}”</p><fp-feedback [evaluation]="r.evaluation" /> }
      </li>
    }
  </ol>`,
})
export class ItemResults { items = input.required<ItemResult[]>(); }

@Component({
  selector: 'fp-score-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="card stack-sm center" [class.card-accent]="score() >= 75" [class.card-pink]="score() < 75" role="status">
    <span class="eyebrow" style="color:inherit;opacity:.8">{{ label() }}</span>
    <span class="big-number">{{ score() }}%</span>
    <p>{{ score() >= 90 ? 'Excellent!' : score() >= 75 ? 'Well done — you passed the 75% target.' : 'Good effort. Review the corrections below and try again later.' }}</p>
  </div>`,
})
export class ScoreBanner { score = input.required<number>(); label = input('Your score'); }
