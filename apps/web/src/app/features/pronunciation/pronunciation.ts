import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api.service';
import { Speech } from '../../core/speech.service';
import { Icon } from '../../shared/icon';
import { SpeakButton } from '../../shared/speak-button';

const PRESETS = ['three', 'think', 'very', 'world', 'water', 'development', 'architecture', 'Could you explain that again?', 'I will look into the issue.', 'Thank you for your time.'];

/**
 * Listen → repeat → (optionally) let the browser's recogniser transcribe → syllable guide.
 * There is no audio-based scoring here unless a speech assessment service is configured on the server;
 * the UI says so plainly.
 */
@Component({
  selector: 'fp-pronunciation',
  imports: [FormsModule, Icon, SpeakButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.syl { display:flex; flex-wrap: wrap; gap: 6px } .syl span { background: var(--accent-soft); color: var(--accent-strong); padding: 6px 12px; border-radius: 12px; font-weight: 600; font-size: 20px }`],
  template: `
  <div class="page stack-lg">
    <div class="stack-sm"><h1>Pronunciation</h1>
      <p class="muted">Listen to the word or sentence, repeat it three times, and compare the syllables.</p>
      <p class="notice small">Honest note: FluentPath does not score your pronunciation from audio yet. If your browser supports voice input, it shows what the speech recogniser heard — useful practice, but not a pronunciation score. Audio is not uploaded or stored.</p></div>
    <div class="pills">@for (p of presets; track p) { <button class="pill" type="button" [attr.aria-pressed]="target === p" (click)="target = p; result.set(null)">{{ p }}</button> }</div>
    <div class="field"><label for="t">Word or sentence</label><input id="t" class="input" [(ngModel)]="target" (ngModelChange)="result.set(null)" /></div>
    <div class="card stack">
      <div class="row-between"><h2 class="break">{{ target }}</h2><fp-speak [text]="target" [rate]="0.7" /></div>
      <div class="row wrap">
        <button class="btn btn-ghost" type="button" (click)="speech.say(target, 0.55)"><fp-icon name="volume" />Slow</button>
        <button class="btn btn-ghost" type="button" (click)="speech.say(target, 0.95)"><fp-icon name="volume" />Normal</button>
        @if (speech.canListen) { <button class="btn" type="button" (click)="record()" [attr.aria-pressed]="speech.listening()"><fp-icon name="mic" />{{ speech.listening() ? 'Listening…' : 'Say it' }}</button> }
        @else { <span class="small muted">Voice input isn't supported in this browser — practise by listening and repeating.</span> }
      </div>
      <button class="btn btn-outline" type="button" (click)="guide()">Show syllables & tips</button>
      @if (error()) { <p class="notice notice-bad" role="alert">{{ error() }}</p> }
      @if (result(); as r) {
        @if (heard()) { <p>Recogniser heard: <strong>“{{ heard() }}”</strong></p> }
        <p class="notice" [class.notice-ok]="r.recognised === true" [class.notice-warn]="r.recognised === false">{{ r.message }}</p>
        @for (w of r.guide.words; track $index) { <div class="stack-sm"><span class="small muted">{{ w.word }}</span><div class="syl">@for (s of w.syllables; track $index) { <span>{{ s }}</span> }</div></div> }
        @for (t of r.guide.tips; track t) { <p class="small">• {{ t }}</p> }
      }
    </div>
  </div>`,
})
export class Pronunciation {
  speech = inject(Speech);
  private api = inject(Api);
  presets = PRESETS;
  target = PRESETS[0];
  heard = signal('');
  error = signal('');
  result = signal<any>(null);

  async record() {
    this.error.set('');
    try { const t = await this.speech.listen(); this.heard.set(t); await this.send(t); }
    catch (e: any) { this.error.set(e.message); }
  }
  guide() { this.heard.set(''); this.send(undefined); }
  private async send(transcript?: string) {
    try { this.result.set(await this.api.post('/pronunciation/attempt', { target: this.target, transcript: transcript || undefined })); }
    catch (e: any) { this.error.set(e.message); }
  }
}
