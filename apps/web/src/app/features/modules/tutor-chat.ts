import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { Icon } from '../../shared/icon';
import { AnswerInput } from '../../shared/answer-input';
import { SpeakButton } from '../../shared/speak-button';

interface Msg { role: 'user' | 'tutor'; text: string; evaluator?: string }

@Component({
  selector: 'fp-tutor-chat',
  imports: [RouterLink, Icon, AnswerInput, SpeakButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.msgs { display:flex; flex-direction:column; gap: 10px; min-height: 40vh }
    .m { max-width: 85%; padding: 12px 16px; border-radius: 20px; } .user { align-self: flex-end; background: var(--accent); color: #fff; border-bottom-right-radius: 6px }
    .tutor { align-self: flex-start; background: var(--surface); border-bottom-left-radius: 6px; display:flex; gap: 8px; align-items:flex-start }`],
  template: `
  <div class="page stack">
    <div class="row"><a class="icon-btn" routerLink="/speak" aria-label="Back"><fp-icon name="left" /></a><h1 style="font-size:var(--t-xl)">Free conversation</h1></div>
    <div class="msgs" #list aria-live="polite">
      <div class="m tutor"><span class="grow">Hello! I'm your English tutor. Tell me about your day — one or two sentences is fine.</span></div>
      @for (m of msgs(); track $index) {
        <div class="m" [class.user]="m.role === 'user'" [class.tutor]="m.role === 'tutor'"><span class="grow break">{{ m.text }}</span>@if (m.role === 'tutor') { <fp-speak [text]="m.text" [size]="36" /> }</div>
      }
    </div>
    @if (error()) { <p class="notice notice-bad" role="alert">{{ error() }}</p> }
    <fp-answer label="Your message" [voice]="true" [(value)]="text" (enter)="send()" placeholder="Type or speak…" />
    <button class="btn btn-block" type="button" (click)="send()" [disabled]="busy() || !text().trim()">{{ busy() ? 'Tutor is replying…' : 'Send' }}</button>
  </div>`,
})
export class TutorChat {
  private api = inject(Api);
  list = viewChild<ElementRef<HTMLElement>>('list');
  msgs = signal<Msg[]>([]);
  text = signal('');
  busy = signal(false);
  error = signal('');
  private sessionId: string | undefined;

  async send() {
    const t = this.text().trim();
    if (!t || this.busy()) return;
    this.busy.set(true); this.error.set('');
    this.msgs.update(m => [...m, { role: 'user', text: t }]); this.text.set('');
    try {
      const r: any = await this.api.post('/agent/chat', { agent: 'tutor', message: t, sessionId: this.sessionId });
      this.sessionId = r.sessionId;
      this.msgs.update(m => [...m, { role: 'tutor', text: r.reply, evaluator: r.evaluator }]);
      setTimeout(() => this.list()?.nativeElement.lastElementChild?.scrollIntoView({ block: 'end', behavior: 'smooth' }));
    } catch (e: any) { this.error.set(e.message); }
    finally { this.busy.set(false); }
  }
}
