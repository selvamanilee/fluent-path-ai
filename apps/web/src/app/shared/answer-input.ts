import { ChangeDetectionStrategy, Component, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Speech } from '../core/speech.service';
import { Icon } from './icon';

/** Text answer with optional voice dictation (where supported). Emits inputMode so the server knows it was spoken. */
@Component({
  selector: 'fp-answer',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="field">
    <label [for]="id">{{ label() }}</label>
    <div class="row" style="align-items:flex-start">
      @if (multiline()) {
        <textarea class="textarea grow" [id]="id" [(ngModel)]="value" [placeholder]="placeholder()" [rows]="rows()" autocapitalize="sentences" autocomplete="off" spellcheck="false" (ngModelChange)="mode.emit('text')" (keydown.control.enter)="enter.emit()" (keydown.meta.enter)="enter.emit()"></textarea>
      } @else {
        <input class="input grow" [id]="id" [(ngModel)]="value" [placeholder]="placeholder()" autocapitalize="sentences" autocomplete="off" spellcheck="false" enterkeyhint="send" (ngModelChange)="mode.emit('text')" (keydown.enter)="enter.emit()" />
      }
      @if (voice() && speech.canListen) {
        <button type="button" class="icon-btn" style="height:52px;width:52px" [attr.aria-pressed]="speech.listening()" (click)="dictate()" [attr.aria-label]="speech.listening() ? 'Stop listening' : 'Answer with your voice'">
          <fp-icon name="mic" />
        </button>
      }
    </div>
    @if (micError()) { <p class="error" role="alert">{{ micError() }}</p> }
    @else if (voice() && !speech.canListen) { <p class="hint">Voice input isn't available in this browser — type your answer.</p> }
    @else if (speech.listening()) { <p class="hint" aria-live="polite">Listening… speak now.</p> }
  </div>`,
})
export class AnswerInput {
  private static n = 0;
  id = `ans-${AnswerInput.n++}`;
  speech = inject(Speech);
  label = input('Your answer');
  placeholder = input('');
  multiline = input(false);
  rows = input(4);
  voice = input(false);
  value = model('');
  mode = output<'text' | 'voice'>();
  enter = output();
  micError = signal('');

  async dictate() {
    if (this.speech.listening()) { this.speech.stop(); return; }
    this.micError.set('');
    try {
      const t = await this.speech.listen();
      if (t) { this.value.set(this.value() ? `${this.value()} ${t}` : t); this.mode.emit('voice'); }
    } catch (e: any) { this.micError.set(e.message); }
  }
}
