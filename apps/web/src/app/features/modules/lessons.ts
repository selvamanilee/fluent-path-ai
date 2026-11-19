import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { Icon } from '../../shared/icon';
import { ErrorView, Loading } from '../../shared/state-view';

@Component({
  selector: 'fp-lessons',
  imports: [RouterLink, Icon, Loading, ErrorView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.t { display:flex; align-items:center; gap: 12px; padding: 12px 14px; border-radius: 16px; background: var(--surface-2); text-decoration:none; color: inherit; min-height: 52px }
    .t.na { opacity: .65 } .n { width: 32px; height: 32px; border-radius: 999px; display:grid; place-items:center; background: var(--surface); font-size: 14px; font-weight: 600; flex:none }
    .t.ok .n { background: var(--ok-soft); color: var(--ok) }`],
  template: `
  <div class="page stack-lg">
    <div class="stack-sm"><h1>Lessons</h1><p class="muted">Grammar from the very beginning to professional English. Each lesson has a simple explanation, Tamil help, examples and practice.</p></div>
    @if (error()) { <fp-error [message]="error()" (retry)="load()" /> }
    @else if (!stages()) { <fp-loading /> }
    @else {
      @for (s of stages(); track s.stage) {
        <section class="card stack-sm">
          <div class="row-between"><h2 style="font-size:var(--t-lg)">Level {{ s.stage }} · {{ s.name }}</h2><span class="tag">{{ countDone(s) }}/{{ s.topics.length }}</span></div>
          @for (t of s.topics; track t.slug; let i = $index) {
            <a class="t" [class.ok]="t.best_score >= 75" [class.na]="!t.available" [routerLink]="['/lesson', t.slug]">
              <span class="n">@if (t.best_score >= 75) { <fp-icon name="check" [size]="16" /> } @else { {{ i + 1 }} }</span>
              <span class="grow break">{{ t.title }}</span>
              <span class="xs muted">{{ t.best_score != null ? t.best_score + '%' : t.available ? '' : 'AI' }}</span>
            </a>
          }
        </section>
      }
      <p class="small muted">Lessons marked “AI” are created by the AI tutor the first time you open them (requires the tutor to be online).</p>
    }
  </div>`,
})
export class Lessons implements OnInit {
  private api = inject(Api);
  stages = signal<any[] | null>(null);
  error = signal('');
  ngOnInit() { this.load(); }
  async load() { this.error.set(''); try { this.stages.set(await this.api.get<any[]>('/lessons')); } catch (e: any) { this.error.set(e.message); } }
  countDone(s: any) { return s.topics.filter((t: any) => t.best_score >= 75).length; }
}
