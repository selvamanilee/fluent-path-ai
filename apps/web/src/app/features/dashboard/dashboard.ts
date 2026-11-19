import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { Auth } from '../../core/auth.service';
import { Icon } from '../../shared/icon';
import { ProgressBar } from '../../shared/progress-bar';
import { ErrorView, Loading } from '../../shared/state-view';
import { SpeakButton } from '../../shared/speak-button';

@Component({
  selector: 'fp-dashboard',
  imports: [RouterLink, Icon, ProgressBar, Loading, ErrorView, SpeakButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .avatar { width: 52px; height: 52px; border-radius: 999px; display: grid; place-items: center; background: var(--pink); color: var(--pink-ink); font-weight: 700; font-size: 20px; flex: none; text-decoration: none }
    .hero { min-height: 200px; display: flex; flex-direction: column; justify-content: space-between; }
    .hero .ic { width: 52px; height: 52px; border-radius: 999px; display: grid; place-items: center; background: rgba(255,255,255,.22) }
    .card-pink .ic { background: rgba(255,255,255,.7) }
    .stat { display: flex; flex-direction: column; gap: 2px } .stat b { font-size: 26px; line-height: 1.1 }
    .skill { display: grid; grid-template-columns: 44px 1fr auto; align-items: center; gap: 12px; }
    .skill .ic { width: 44px; height: 44px; border-radius: 999px; display: grid; place-items: center; background: var(--surface-3) }
    .week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; align-items: end; height: 120px }
    .week div { display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100% ; justify-content: flex-end }
    .week span.b { width: 100%; max-width: 28px; border-radius: 8px; background: var(--accent); min-height: 4px }
    .week span.b.zero { background: var(--surface-3) }
    .words { display: flex; flex-wrap: wrap; gap: 8px }
    @media (min-width: 900px) { .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start } }
  `],
  template: `
  <div class="page page-wide stack-lg">
    @if (error()) { <fp-error [message]="error()" (retry)="load()" /> }
    @else if (!d()) { <fp-loading /> }
    @else {
      @let x = d();
      <header class="row-between">
        <div class="stack-sm"><h1 class="break">Hello {{ x.greeting }}!</h1>
          <p class="muted small">Level {{ x.level.id }} · {{ x.level.name }} · Day {{ x.dayNumber }}</p></div>
        <a class="avatar" routerLink="/settings" aria-label="Settings">{{ initial() }}</a>
      </header>

      <nav class="pills" aria-label="Skills">
        <a class="pill active" routerLink="/daily">Today</a>
        <a class="pill" routerLink="/read">Read</a><a class="pill" routerLink="/write">Write</a>
        <a class="pill" routerLink="/speak">Speak</a><a class="pill" routerLink="/lesson">Lesson</a>
        <a class="pill" routerLink="/vocabulary">Words</a>
      </nav>

      <div class="grid-2">
        <a class="card card-accent hero" routerLink="/daily">
          <span class="ic"><fp-icon name="bulb" /></span>
          <div class="stack-sm"><span>{{ x.today?.status === 'completed' ? 'Day complete!' : "Today's learning" }}</span>
            <span class="big-number">{{ x.today?.done ?? 0 }}/{{ x.today?.total ?? 10 }}</span>
            <fp-progress [value]="x.today?.done ?? 0" [max]="x.today?.total ?? 10" label="Today's activities" /></div>
        </a>
        <a class="card card-pink hero" routerLink="/revision">
          <span class="ic"><fp-icon name="repeat" /></span>
          <div class="stack-sm"><span>Revision due</span><span class="big-number">{{ x.revisionDue }}</span>
            <span class="small" style="opacity:.75">{{ x.revisionDue ? 'Review now to remember' : 'All caught up' }}</span></div>
        </a>
      </div>

      <a class="btn btn-lg btn-block" routerLink="/daily">{{ x.today?.status === 'completed' ? 'Review today’s learning' : x.today?.done ? 'Continue today’s learning' : 'Start today’s learning' }}</a>

      <div class="card row-between">
        <div class="stat"><span class="xs muted">Streak</span><b>{{ x.streak.current }} 🔥</b></div>
        <div class="stat"><span class="xs muted">Today</span><b>{{ x.today?.minutes ?? 0 }}<span class="small muted">/{{ x.today?.targetMinutes ?? 30 }}m</span></b></div>
        <div class="stat"><span class="xs muted">Total time</span><b>{{ x.learningTime.totalMinutes }}<span class="small muted">m</span></b></div>
        <div class="stat"><span class="xs muted">Days done</span><b>{{ x.learningTime.daysCompleted }}</b></div>
      </div>

      <div class="cols stack-lg">
        <section class="stack">
          <h2>Your skills</h2>
          @for (s of skillCards; track s.key) {
            @let sc = x.skills[s.key];
            <a class="card skill" [routerLink]="s.to">
              <span class="ic"><fp-icon [name]="s.icon" /></span>
              <div class="stack-sm"><strong>{{ s.label }}</strong><fp-progress [value]="sc.avg ?? 0" [label]="s.label + ' average'" /></div>
              <span class="small">{{ sc.avg === null ? 'New' : sc.avg + '%' }}</span>
            </a>
          }
        </section>
        <section class="stack">
          <div class="card stack-sm">
            <div class="row-between"><h3>Today's words</h3><a class="link small" routerLink="/vocabulary">Library</a></div>
            <div class="words">@for (w of x.vocabularyPreview; track w.word) { <span class="tag tag-accent" style="font-size:15px;padding:6px 6px 6px 12px">{{ w.word }} <span class="ta" lang="ta" style="font-weight:400">· {{ w.meaning_ta }}</span><fp-speak [text]="w.word" [size]="32" /></span> }</div>
          </div>
          <div class="grid-2">
            <a class="card stack-sm" [routerLink]="x.grammarTopic ? '/lesson/' + x.grammarTopic.slug : '/lesson'"><span class="eyebrow">Grammar today</span><strong class="break">{{ x.grammarTopic?.title ?? 'Lessons' }}</strong></a>
            <a class="card stack-sm" routerLink="/daily"><span class="eyebrow">Mini-exam</span>
              <strong>{{ x.miniExam?.status === 'done' ? x.miniExam.score + '%' : 'Not taken' }}</strong></a>
          </div>
          <div class="card stack">
            <div class="row-between"><h3>This week</h3><span class="small muted">minutes / day</span></div>
            <div class="week" role="img" [attr.aria-label]="weekLabel()">
              @for (w of x.weekly; track w.date) { <div><span class="xs muted">{{ w.minutes || '' }}</span><span class="b" [class.zero]="!w.minutes" [style.height.%]="barH(w.minutes)"></span><span class="xs muted">{{ dayName(w.date) }}</span></div> }
            </div>
          </div>
          <div class="card stack-sm">
            <div class="row-between"><h3>Achievements</h3><a class="link small" routerLink="/progress">All</a></div>
            @for (a of x.achievements; track a.code) { <div class="row"><fp-icon [name]="a.icon" /><span>{{ a.title }}</span></div> }
            @empty { <p class="small muted">Finish today's session to earn your first badge.</p> }
          </div>
        </section>
      </div>
    }
  </div>`,
})
export class Dashboard implements OnInit {
  private api = inject(Api);
  private auth = inject(Auth);
  d = signal<any>(null);
  error = signal('');
  initial = computed(() => (this.d()?.greeting ?? this.auth.user()?.displayName ?? '?').trim().charAt(0).toUpperCase());
  skillCards = [
    { key: 'read', label: 'Read', icon: 'book', to: '/read' }, { key: 'write', label: 'Write', icon: 'pen', to: '/write' },
    { key: 'speak', label: 'Speak', icon: 'mic', to: '/speak' }, { key: 'lesson', label: 'Lesson', icon: 'cap', to: '/lesson' },
  ] as const;
  ngOnInit() { this.load(); }
  async load() { this.error.set(''); try { this.d.set(await this.api.get('/dashboard')); } catch (e: any) { this.error.set(e.message); } }
  barH(m: number) { const max = Math.max(30, ...this.d().weekly.map((w: any) => w.minutes)); return Math.max(4, (m / max) * 80); }
  dayName(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('en', { weekday: 'narrow' }); }
  weekLabel() { return 'Minutes learned per day this week: ' + this.d().weekly.map((w: any) => `${w.date} ${w.minutes} minutes`).join(', '); }
}
