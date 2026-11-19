import { ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api.service';
import { Speech } from '../../core/speech.service';
import { Word, Evaluation } from '../../core/models';
import { Icon } from '../../shared/icon';
import { SpeakButton } from '../../shared/speak-button';
import { Feedback } from '../../shared/corrections';
import { ErrorView, Loading } from '../../shared/state-view';

type Step = 'listen' | 'spell' | 'meaning' | 'sentence' | 'done';

@Component({
  selector: 'fp-category',
  imports: [RouterLink, FormsModule, Icon, SpeakButton, Feedback, Loading, ErrorView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.w { display:grid; grid-template-columns: 1fr auto; gap: 8px; align-items:center } .w h3 { font-size: 22px }
    .status { font-size: 12px } dialog { border: 0; padding: 0; background: transparent; width: min(560px, 100%); max-height: 100dvh; color: var(--text) }
    dialog::backdrop { background: rgba(0,0,0,.5) } .sheet { margin-top: auto; border-radius: 28px 28px 0 0; padding-bottom: calc(20px + var(--safe-bottom)) }
    .steps { display:flex; gap: 6px } .steps span { flex:1; height: 4px; border-radius: 4px; background: var(--surface-3) } .steps span.on { background: var(--accent) }`],
  template: `
  <div class="page stack">
    <a class="icon-btn" routerLink="/vocabulary" aria-label="Back to categories"><fp-icon name="left" /></a>
    @if (error()) { <fp-error [message]="error()" (retry)="load()" /> }
    @else if (!data()) { <fp-loading /> }
    @else {
      <div class="stack-sm"><h1>{{ data().category.name }}</h1><p class="muted ta" lang="ta">{{ data().category.name_ta }}</p></div>
      @for (w of data().words; track w.id) {
        <article class="card stack-sm">
          <div class="w"><div class="stack-sm" style="gap:2px"><h3 class="break">{{ w.word }}</h3><span class="small muted">{{ w.ipa ? '/' + w.ipa + '/ · ' : '' }}{{ w.pronunciation }} · {{ w.part_of_speech }}</span></div><fp-speak [text]="w.word" [rate]="0.7" /></div>
          <p><span class="ta" lang="ta">{{ w.meaning_ta }}</span> — {{ w.meaning_en }}</p>
          <p class="small break"><em>{{ w.example }}</em><br /><span class="muted ta" lang="ta">{{ w.example_ta }}</span></p>
          <div class="row-between"><span class="tag status" [class.tag-ok]="w.status === 'mastered'" [class.tag-accent]="w.status === 'learning'">{{ w.status === 'new' ? 'New' : w.status === 'mastered' ? 'Mastered' : 'Learning' }}</span>
            <button class="btn btn-ghost" style="min-height:40px;padding:8px 16px" type="button" (click)="practise(w)">Practise</button></div>
        </article>
      }
    }
  </div>

  <dialog #dlg (close)="active.set(null)" aria-labelledby="pr-title">
    @if (active(); as w) {
      <div class="card sheet stack">
        <div class="row-between"><h2 id="pr-title">{{ w.word }}</h2><button class="icon-btn" type="button" (click)="dlg.close()" aria-label="Close"><fp-icon name="x" /></button></div>
        <div class="steps" aria-hidden="true">@for (s of order; track s) { <span [class.on]="order.indexOf(step()) >= order.indexOf(s)"></span> }</div>
        @switch (step()) {
          @case ('listen') {
            <p>1. Listen, then say it three times aloud.</p>
            <div class="row"><fp-speak [text]="w.word" [rate]="0.7" /><span class="muted">{{ w.pronunciation }}</span></div>
            <button class="btn btn-block" type="button" (click)="step.set('spell')">I said it 3 times</button>
          }
          @case ('spell') {
            <p>2. Listen and type the spelling.</p>
            <div class="row"><fp-speak [text]="w.word" [rate]="0.7" /><input class="input grow" [(ngModel)]="answer" aria-label="Spelling" autocapitalize="off" autocomplete="off" spellcheck="false" (keydown.enter)="check('spell')" /></div>
            <button class="btn btn-block" type="button" (click)="check('spell')" [disabled]="busy() || !answer.trim()">Check</button>
          }
          @case ('meaning') {
            <p>3. What does it mean? Choose one.</p>
            <div class="options">@for (o of meaningOptions(); track o) { <button type="button" class="option" (click)="answer = o; check('meaning')">{{ o }}</button> }</div>
          }
          @case ('sentence') {
            <p>4. Make your own sentence with “{{ w.word }}”.</p>
            <input class="input" [(ngModel)]="answer" aria-label="Your sentence" autocapitalize="sentences" (keydown.enter)="check('sentence')" />
            <button class="btn btn-block" type="button" (click)="check('sentence')" [disabled]="busy() || !answer.trim()">{{ busy() ? 'Checking…' : 'Check my sentence' }}</button>
          }
          @case ('done') { <p class="notice notice-ok">Great practice! This word is now in your revision schedule.</p><button class="btn btn-block" type="button" (click)="dlg.close()">Done</button> }
        }
        @if (msg()) { <p class="notice" [class.notice-ok]="ok()" [class.notice-bad]="!ok()" role="status">{{ msg() }}</p> }
        @if (evaluation()) { <fp-feedback [evaluation]="evaluation()!" /> }
      </div>
    }
  </dialog>`,
})
export class Category implements OnInit {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  private speech = inject(Speech);
  data = signal<any>(null);
  error = signal('');
  active = signal<Word | null>(null);
  step = signal<Step>('listen');
  order: Step[] = ['listen', 'spell', 'meaning', 'sentence'];
  answer = '';
  msg = signal(''); ok = signal(false); busy = signal(false);
  evaluation = signal<Evaluation | null>(null);
  meaningOptions = signal<string[]>([]);
  dlg = viewChild<ElementRef<HTMLDialogElement>>('dlg');

  ngOnInit() { this.load(); }
  async load() { this.error.set(''); try { this.data.set(await this.api.get(`/vocabulary/categories/${this.route.snapshot.paramMap.get('slug')}`)); } catch (e: any) { this.error.set(e.message); } }

  practise(w: Word) {
    this.active.set(w); this.step.set('listen'); this.answer = ''; this.msg.set(''); this.evaluation.set(null);
    const others = this.data().words.filter((x: Word) => x.id !== w.id).sort(() => Math.random() - 0.5).slice(0, 2).map((x: Word) => x.meaning_en);
    this.meaningOptions.set([w.meaning_en, ...others].sort(() => Math.random() - 0.5));
    this.dlg()?.nativeElement.showModal();
    this.speech.say(w.word, 0.7);
  }

  async check(task: 'spell' | 'meaning' | 'sentence') {
    const w = this.active()!;
    this.busy.set(true); this.msg.set(''); this.evaluation.set(null);
    try {
      const r: any = await this.api.post(`/vocabulary/${w.id}/practice`, { task, answer: this.answer });
      this.ok.set(r.correct);
      if (task === 'sentence') { this.evaluation.set(r.evaluation); if (r.correct) this.step.set('done'); }
      else {
        this.msg.set(r.correct ? 'Correct!' : `Not quite. The answer is “${r.expected}”.`);
        if (r.correct) { this.answer = ''; this.step.set(task === 'spell' ? 'meaning' : 'sentence'); }
      }
      this.data.update(d => ({ ...d, words: d.words.map((x: any) => x.id === w.id && x.status === 'new' ? { ...x, status: 'learning' } : x) }));
    } catch (e: any) { this.ok.set(false); this.msg.set(e.message); }
    finally { this.busy.set(false); }
  }
}
