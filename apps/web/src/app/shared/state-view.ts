import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'fp-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="stack" aria-busy="true" aria-live="polite"><span class="sr-only">Loading…</span>
    @for (i of rows(); track i) { <div class="skeleton" [style.height.px]="i === 0 ? 120 : 64"></div> }</div>`,
})
export class Loading { rows = input([0, 1, 2]); }

@Component({
  selector: 'fp-error',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="card stack-sm center" role="alert">
    <fp-icon name="alert" [size]="32" style="margin:0 auto;color:var(--bad)" />
    <h3>{{ title() }}</h3><p class="muted">{{ message() }}</p>
    <button class="btn" type="button" (click)="retry.emit()" style="align-self:center">Try again</button></div>`,
})
export class ErrorView { title = input('We could not load this'); message = input(''); retry = output(); }

@Component({
  selector: 'fp-empty',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="card-2 stack-sm center"><fp-icon [name]="icon()" [size]="28" style="margin:0 auto;color:var(--accent)" />
    <h3>{{ title() }}</h3><p class="muted small">{{ message() }}</p><ng-content /></div>`,
})
export class Empty { icon = input('sparkle'); title = input(''); message = input(''); }
