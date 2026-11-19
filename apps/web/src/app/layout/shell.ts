import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from '../shared/icon';
import { Auth } from '../core/auth.service';

const PRIMARY = [
  { to: '/', icon: 'home', label: 'Home', exact: true },
  { to: '/daily', icon: 'play', label: 'Today', exact: false },
  { to: '/learn', icon: 'book', label: 'Learn', exact: false },
  { to: '/exams', icon: 'award', label: 'Exams', exact: false },
  { to: '/progress', icon: 'chart', label: 'Progress', exact: false },
];
const ALL = [
  { to: '/', icon: 'home', label: 'Dashboard', exact: true },
  { to: '/daily', icon: 'play', label: 'Daily Learning' },
  { to: '/read', icon: 'book', label: 'Read' },
  { to: '/write', icon: 'pen', label: 'Write' },
  { to: '/speak', icon: 'mic', label: 'Speak' },
  { to: '/lesson', icon: 'cap', label: 'Lesson' },
  { to: '/vocabulary', icon: 'bookmark', label: 'Vocabulary' },
  { to: '/pronunciation', icon: 'volume', label: 'Pronunciation' },
  { to: '/technical', icon: 'code', label: 'Technical English' },
  { to: '/exams', icon: 'award', label: 'Exams' },
  { to: '/progress', icon: 'chart', label: 'Progress' },
  { to: '/revision', icon: 'repeat', label: 'Revision' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
];

@Component({
  selector: 'fp-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; min-height: 100dvh; }
    main { padding-bottom: calc(var(--tabbar-h) + var(--safe-bottom) + 16px); }
    .tabbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: grid; grid-template-columns: repeat(5, 1fr);
      background: var(--surface); border-top: 1px solid var(--line); padding: 6px max(8px, var(--safe-left)) calc(6px + var(--safe-bottom)) max(8px, var(--safe-right)); }
    .tab { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 52px; border-radius: 16px;
      text-decoration: none; color: var(--muted); font-size: 12px; font-weight: 500; }
    .tab.active { color: var(--accent-strong); }
    .tab.active fp-icon { background: var(--accent-soft); border-radius: 999px; padding: 2px 14px; }
    .rail { display: none; }
    @media (min-width: 900px) {
      .tabbar { display: none; }
      main { padding-bottom: 32px; margin-left: 248px; }
      .rail { display: flex; flex-direction: column; gap: 2px; position: fixed; inset: 0 auto 0 0; width: 248px; padding: 24px 16px; overflow-y: auto;
        background: var(--surface); border-right: 1px solid var(--line); }
      .brand { font-weight: 700; font-size: 22px; padding: 0 12px 16px; }
      .brand span { color: var(--accent-strong); }
      .rail a { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px; text-decoration: none; color: var(--text); font-weight: 500; }
      .rail a:hover { background: var(--surface-2); }
      .rail a.active { background: var(--accent); color: var(--accent-ink); }
    }
  `],
  template: `
    <a class="sr-only" href="#main">Skip to content</a>
    <nav class="rail" aria-label="Main">
      <div class="brand">Fluent<span>Path</span> AI</div>
      @for (n of all; track n.to) {
        <a [routerLink]="n.to" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!n.exact }"><fp-icon [name]="n.icon" />{{ n.label }}</a>
      }
      <button class="btn btn-ghost" type="button" style="margin-top:auto" (click)="auth.logout()"><fp-icon name="logout" />Sign out</button>
    </nav>
    <main id="main" tabindex="-1"><router-outlet /></main>
    <nav class="tabbar" aria-label="Main">
      @for (n of primary; track n.to) {
        <a class="tab" [routerLink]="n.to" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: n.exact }" [attr.aria-label]="n.label"><fp-icon [name]="n.icon" /><span>{{ n.label }}</span></a>
      }
    </nav>`,
})
export class Shell {
  auth = inject(Auth);
  primary = PRIMARY;
  all = ALL;
}
