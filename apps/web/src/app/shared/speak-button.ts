import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Speech } from '../core/speech.service';
import { Icon } from './icon';

/** Text-to-speech "listen" button. Hidden when the browser has no speech synthesis. */
@Component({
  selector: 'fp-speak',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (speech.canSpeak) {
    <button type="button" class="icon-btn" [style.width.px]="size()" [style.height.px]="size()" (click)="speech.say(text(), rate())" [attr.aria-label]="'Listen: ' + text()" [title]="'Listen'">
      <fp-icon name="volume" [size]="20" />
    </button>}`,
})
export class SpeakButton {
  speech = inject(Speech);
  text = input.required<string>();
  rate = input(0.9);
  size = input(48);
}
