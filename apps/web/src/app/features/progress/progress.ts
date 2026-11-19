import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Api } from '../../core/api.service';
import { Icon } from '../../shared/icon';
import { ProgressBar } from '../../shared/progress-bar';
import { ErrorView, Loading, Empty } from '../../shared/state-view';

const LABEL: Record<string, string> = { read: 'Read', write: 'Write', speak: 'Speak', lesson: 'Lesson', vocabulary: 'Vocabulary', technical: 'Technical', pronunciation: 'Pronunciation' };
const CAT: Record<string, string> = { 'be-verb': 'am / is / are', 'have-has': 'have / has', agreement: 'he/she + verb-s', article: 'a / an / the', modal: 'can / could + verb', plural: 'plurals', introduction: 'introducing yourself', 'word-order': 'word order', grammar: 'grammar', tense: 'tenses' };

@Component({
  selector: 'fp-progress-page',
  imports: [RouterLink, DatePipe, DecimalPipe, Icon, ProgressBar, Loading, ErrorView, Empty],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.sk { display:grid; grid-template-columns: 100px 1fr 48px; gap: 12px; align-items:center } .ach { display:grid; grid-template-columns: 44px 1fr; gap: 12px; align-items:center }
    .ach .ic { width:44px;height:44px;border-radius:999px;display:grid;place-items:center;background:var(--surface-2) } .ach.on .ic { background: var(--pink); color: var(--pink-ink) } .ach:not(.on) { opacity: .55 }
    .ex { display:grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align:center }`],
  template: `
  <div class="page page-wide stack-lg">
    <h1>Progress</h1>
    @if (error()) { <fp-error [message]="error()" (retry)="load()" /> }
    @else if (!p()) { <fp-loading /> }
    @else {
      @let x = p();
      <div class="card card-accent stack-sm"><span class="eyebrow" style="color:inherit;opacity:.8">Current level</span><h2>Level {{ x.level.id }} · {{ x.level.name }}</h2><p class="small">{{ x.level.description }}</p></div>
      <section class="card stack-sm">
        <h3>Level readiness <span class="small muted">(75% in each exam)</span></h3>
        <div class="ex">@for (t of exams; track t) { @let v = x.readiness.status[t];
          <div class="card-2 stack-sm" style="padding:10px"><span class="xs muted">{{ label[t] }}</span><strong [style.color]="v >= 75 ? 'var(--ok)' : null">{{ v === null ? '—' : (v | number: '1.0-0') + '%' }}</strong></div> }</div>
        <a class="link small" routerLink="/exams">Go to exams</a>
      </section>
      <section class="card stack-sm"><h3>Skills (average)</h3>
        @for (s of x.skills; track s.skill) { <div class="sk"><span>{{ label[s.skill] ?? s.skill }}</span><fp-progress [value]="s.avg" [label]="label[s.skill] + ' average'" /><span class="small">{{ s.avg }}%</span></div> }
        @empty { <p class="small muted">Complete activities to see your skill scores.</p> }
      </section>
      <section class="card stack-sm"><h3>Vocabulary</h3><p><strong>{{ x.vocabulary.learned }}</strong> words learned · <strong>{{ x.vocabulary.mastered }}</strong> mastered</p></section>
      <section class="card stack-sm"><h3>Recurring mistakes</h3>
        @for (m of x.mistakes; track m.category) {
          <div class="card-2 stack-sm"><div class="row-between"><strong>{{ cat(m.category) }}</strong><span class="tag tag-warn">{{ m.count }}×</span></div>
            <p class="small break"><span style="text-decoration:line-through;color:var(--muted)">{{ m.example_original }}</span> → <span style="color:var(--ok)">{{ m.example_corrected }}</span></p></div>
        } @empty { <fp-empty icon="check" title="No recurring mistakes" message="Mistakes you make in writing and speaking will be tracked here and added to revision." /> }
        @if (x.mistakes.length) { <a class="btn btn-ghost" routerLink="/revision">Revise my mistakes</a> }
      </section>
      <section class="card stack-sm"><h3>Achievements</h3>
        @for (a of x.achievements; track a.code) { <div class="ach" [class.on]="a.earned_at"><span class="ic"><fp-icon [name]="a.icon" /></span><div><strong>{{ a.title }}</strong><p class="xs muted">{{ a.description }}@if (a.earned_at) { · {{ a.earned_at | date: 'mediumDate' }} }</p></div></div> }
      </section>
    }
  </div>`,
})
export class Progress implements OnInit {
  private api = inject(Api);
  p = signal<any>(null);
  error = signal('');
  label = LABEL;
  exams = ['read', 'write', 'speak', 'lesson'];
  cat(c: string) { return CAT[c] ?? c; }
  ngOnInit() { this.load(); }
  async load() { this.error.set(''); try { this.p.set(await this.api.get('/progress')); } catch (e: any) { this.error.set(e.message); } }
}
