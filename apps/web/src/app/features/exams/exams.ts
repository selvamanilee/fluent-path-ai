import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Api } from '../../core/api.service';
import { Icon } from '../../shared/icon';
import { Loading } from '../../shared/state-view';

@Component({
  selector: 'fp-exams',
  imports: [RouterLink, DatePipe, DecimalPipe, Icon, Loading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.ex { display:flex; flex-direction:column; gap: 10px; min-height: 170px } .ic { width:48px;height:48px;border-radius:999px;display:grid;place-items:center;background:rgba(255,255,255,.22) }
    .card-pink .ic { background: rgba(255,255,255,.7) } .h { display:grid; grid-template-columns: 1fr auto; gap: 8px; align-items:center; text-decoration:none; color:inherit }`],
  template: `
  <div class="page stack-lg">
    <div class="stack-sm"><h1>Exams</h1><p class="muted">Four exams, 100 marks each. Questions are randomized. Score 75% in all four at your level to move up.</p></div>
    <div class="grid-2">
      @for (e of exams; track e.type; let i = $index) {
        <button class="card ex" [class.card-accent]="i % 3 === 0" [class.card-pink]="i % 3 !== 0" type="button" (click)="start(e.type)" [disabled]="busy()">
          <span class="ic"><fp-icon [name]="e.icon" /></span><h3>{{ e.title }}</h3><p class="small muted">{{ e.desc }}</p>
          <span class="small"><strong>{{ latest(e.type) }}</strong></span>
        </button>
      }
    </div>
    @if (error()) { <p class="notice notice-bad" role="alert">{{ error() }}</p> }
    <section class="stack-sm"><h2>History</h2>
      @if (!history()) { <fp-loading [rows]="[1]" /> }
      @else {
        @for (h of history(); track h.id) {
          <a class="card h" [routerLink]="['/exams', h.id]"><div><strong>{{ titleOf(h.exam_type) }}</strong><p class="xs muted">{{ h.started_at | date: 'medium' }} · Level {{ h.level_id }}</p></div>
            @if (h.submitted_at) { <span class="tag" [class.tag-ok]="h.passed" [class.tag-warn]="!h.passed">{{ h.percent | number: '1.0-0' }}%</span> } @else { <span class="tag">Continue</span> }</a>
        } @empty { <p class="small muted">No exams yet. Try the Lesson exam after a few days of learning.</p> }
      }
    </section>
  </div>`,
})
export class Exams implements OnInit {
  private api = inject(Api);
  private router = inject(Router);
  busy = signal(false);
  error = signal('');
  history = signal<any[] | null>(null);
  exams = [
    { type: 'read', title: 'Read exam', icon: 'book', desc: 'Comprehension, vocabulary, sentence meaning' },
    { type: 'write', title: 'Write exam', icon: 'pen', desc: 'Sentences, grammar, paragraph, email' },
    { type: 'speak', title: 'Speak exam', icon: 'mic', desc: 'Fluency, grammar, vocabulary (speak or type)' },
    { type: 'lesson', title: 'Lesson exam', icon: 'cap', desc: 'Grammar, tenses, phrases, corrections' },
  ];
  ngOnInit() { this.api.get<any[]>('/exams').then(h => this.history.set(h)).catch(e => { this.error.set(e.message); this.history.set([]); }); }
  titleOf(t: string) { return this.exams.find(e => e.type === t)?.title ?? t; }
  latest(t: string) { const h = (this.history() ?? []).find(x => x.exam_type === t && x.submitted_at); return h ? `Last: ${Math.round(h.percent)}%` : 'Not taken yet'; }
  async start(type: string) {
    this.busy.set(true); this.error.set('');
    try { const a: any = await this.api.post('/exams', { examType: type }); await this.router.navigate(['/exams', a.id]); }
    catch (e: any) { this.error.set(e.message); }
    finally { this.busy.set(false); }
  }
}
