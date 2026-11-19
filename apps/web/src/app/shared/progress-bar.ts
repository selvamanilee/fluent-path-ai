import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'fp-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="bar" role="progressbar" [attr.aria-valuenow]="value()" aria-valuemin="0" [attr.aria-valuemax]="max()" [attr.aria-label]="label()"><span [style.width.%]="pct()"></span></div>`,
})
export class ProgressBar {
  value = input(0);
  max = input(100);
  label = input('Progress');
  pct = computed(() => Math.max(0, Math.min(100, (this.value() / (this.max() || 1)) * 100)));
}
