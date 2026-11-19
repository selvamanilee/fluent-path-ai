import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'fp-learn',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.big { min-height: 150px; display:flex; flex-direction:column; justify-content:space-between; gap: 12px }
    .ic { width: 48px; height: 48px; border-radius: 999px; display:grid; place-items:center; background: rgba(255,255,255,.22) } .card-pink .ic { background: rgba(255,255,255,.7) }
    .item { display:grid; grid-template-columns: 44px 1fr auto; gap: 12px; align-items:center } .item .ic { background: var(--surface-2) }`],
  template: `
  <div class="page stack-lg">
    <h1>Learn</h1>
    <div class="grid-2">
      @for (m of main; track m.to; let i = $index) {
        <a class="card big" [class.card-accent]="i % 3 === 0" [class.card-pink]="i % 3 !== 0" [routerLink]="m.to">
          <span class="ic"><fp-icon [name]="m.icon" /></span><div><h3>{{ m.label }}</h3><p class="small muted">{{ m.desc }}</p></div></a>
      }
    </div>
    <div class="stack-sm">
      @for (m of more; track m.to) {
        <a class="card item" [routerLink]="m.to"><span class="ic"><fp-icon [name]="m.icon" /></span><div><strong>{{ m.label }}</strong><p class="small muted">{{ m.desc }}</p></div><fp-icon name="right" /></a>
      }
    </div>
  </div>`,
})
export class Learn {
  main = [
    { to: '/read', icon: 'book', label: 'Read', desc: 'Passages & questions' },
    { to: '/write', icon: 'pen', label: 'Write', desc: 'Get corrections' },
    { to: '/speak', icon: 'mic', label: 'Speak', desc: 'Conversations' },
    { to: '/lesson', icon: 'cap', label: 'Lesson', desc: 'Grammar, 5 stages' },
  ];
  more = [
    { to: '/vocabulary', icon: 'bookmark', label: 'Vocabulary', desc: 'Everyday words with Tamil meanings' },
    { to: '/pronunciation', icon: 'volume', label: 'Pronunciation', desc: 'Listen, repeat, syllables' },
    { to: '/technical', icon: 'code', label: 'Technical English', desc: 'Stand-ups, code reviews, production issues' },
    { to: '/revision', icon: 'repeat', label: 'Revision', desc: 'Spaced repetition queue' },
    { to: '/settings', icon: 'settings', label: 'Settings', desc: 'Profile, preferences, install app' },
  ];
}
