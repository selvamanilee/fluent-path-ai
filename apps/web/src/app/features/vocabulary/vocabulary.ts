import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api.service';
import { Icon } from '../../shared/icon';
import { ProgressBar } from '../../shared/progress-bar';
import { ErrorView, Loading, Empty } from '../../shared/state-view';

@Component({
  selector: 'fp-vocabulary',
  imports: [RouterLink, FormsModule, Icon, ProgressBar, Loading, ErrorView, Empty],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.cat { display:flex; flex-direction:column; gap: 10px; min-height: 140px } .ic { width:44px;height:44px;border-radius:999px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent-strong) }
    .locked { opacity: .55 }`],
  template: `
  <div class="page page-wide stack-lg">
    <div class="stack-sm"><h1>Vocabulary</h1><p class="muted">Everyday English words with Tamil meanings, pronunciation and examples.</p></div>
    <div class="field"><label for="q" class="sr-only">Search categories</label><input id="q" class="input" type="search" placeholder="Search categories (e.g. food, office)" [(ngModel)]="q" /></div>
    @if (error()) { <fp-error [message]="error()" (retry)="load()" /> }
    @else if (!cats()) { <fp-loading /> }
    @else {
      <div class="grid-auto">
        @for (c of filtered(); track c.slug) {
          @if (c.unlocked) {
            <a class="card cat" [routerLink]="['/vocabulary', c.slug]">
              <span class="ic"><fp-icon [name]="c.icon" /></span>
              <div><strong>{{ c.name }}</strong><p class="small muted ta" lang="ta">{{ c.name_ta }}</p></div>
              <fp-progress [value]="c.learned" [max]="c.total" [label]="c.name + ' words learned'" />
              <span class="xs muted">{{ c.learned }}/{{ c.total }} learned{{ c.mastered ? ' · ' + c.mastered + ' mastered' : '' }}</span>
            </a>
          } @else {
            <div class="card cat locked"><span class="ic"><fp-icon name="lock" /></span><div><strong>{{ c.name }}</strong><p class="small muted">Unlocks at Level {{ c.min_level }}</p></div></div>
          }
        } @empty { <fp-empty title="No matching category" message="Try another word." /> }
      </div>
    }
  </div>`,
})
export class Vocabulary implements OnInit {
  private api = inject(Api);
  cats = signal<any[] | null>(null);
  error = signal('');
  q = '';
  filtered() { const t = this.q.trim().toLowerCase(); return (this.cats() ?? []).filter(c => !t || c.name.toLowerCase().includes(t) || c.slug.includes(t)); }
  ngOnInit() { this.load(); }
  async load() { this.error.set(''); try { this.cats.set(await this.api.get<any[]>('/vocabulary/categories')); } catch (e: any) { this.error.set(e.message); } }
}
