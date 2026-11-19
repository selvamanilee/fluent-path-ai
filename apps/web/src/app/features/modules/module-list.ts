import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { Icon } from '../../shared/icon';
import { ErrorView, Loading, Empty } from '../../shared/state-view';

const META: Record<string, { title: string; icon: string; api: string; desc: string }> = {
  read: { title: 'Read', icon: 'book', api: '/reading', desc: 'Read a passage, learn difficult words, check the meaning of each sentence and answer five questions.' },
  write: { title: 'Write', icon: 'pen', api: '/writing', desc: 'Write on your own first. You get corrections, explanations and a natural, professional version.' },
  speak: { title: 'Speak', icon: 'mic', api: '/speaking', desc: 'One question at a time. Speak (where your browser supports it) or type. We correct your sentence and give a better way to say it.' },
  technical: { title: 'Technical English', icon: 'code', api: '/technical', desc: 'Workplace English for IT: stand-ups, code reviews, production issues. Unlocks step by step with your level.' },
};

@Component({
  selector: 'fp-module-list',
  imports: [RouterLink, Icon, Loading, ErrorView, Empty],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.item { display:grid; grid-template-columns: 44px 1fr auto; gap: 12px; align-items:center }
    .ic { width:44px;height:44px;border-radius:999px;display:grid;place-items:center;background:var(--surface-2) } .locked { opacity: .6 }`],
  template: `
  <div class="page stack-lg">
    <div class="stack-sm"><h1>{{ meta().title }}</h1><p class="muted">{{ meta().desc }}</p></div>
    @if (module() === 'speak') {
      <a class="card card-pink item" routerLink="/speak/chat"><span class="ic" style="background:rgba(255,255,255,.7)"><fp-icon name="chat" /></span><div><strong>Free conversation</strong><p class="small muted">Chat with your tutor about anything.</p></div><fp-icon name="right" /></a>
      <a class="card item" routerLink="/pronunciation"><span class="ic"><fp-icon name="volume" /></span><div><strong>Pronunciation trainer</strong><p class="small muted">Listen, repeat and see syllables.</p></div><fp-icon name="right" /></a>
    }
    @if (error()) { <fp-error [message]="error()" (retry)="load()" /> }
    @else if (!items()) { <fp-loading [rows]="[1,2,3]" /> }
    @else {
      @for (lv of levels(); track lv) {
        <section class="stack-sm"><h2 class="small eyebrow">Level {{ lv }}</h2>
          @for (it of byLevel(lv); track it.id) {
            @if (it.unlocked === false) {
              <div class="card item locked" aria-disabled="true"><span class="ic"><fp-icon name="lock" /></span><div><strong class="break">{{ it.title || it.topic }}</strong><p class="small muted">Unlocks at Level {{ it.level_id }}</p></div><span></span></div>
            } @else {
              <a class="card item" [routerLink]="[it.id]"><span class="ic"><fp-icon [name]="meta().icon" /></span>
                <div><strong class="break">{{ it.title || it.topic }}</strong><p class="small muted">{{ it.attempts ? 'Best ' + it.best_score + '% · ' + it.attempts + ' attempt' + (it.attempts > 1 ? 's' : '') : 'Not started' }}@if (it.source === 'ai') { · AI-generated }</p></div>
                <fp-icon name="right" /></a>
            }
          }
        </section>
      } @empty { <fp-empty title="No exercises yet" message="New exercises will appear as you progress." /> }
    }
  </div>`,
})
export class ModuleList implements OnInit {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  module = signal<string>(this.route.snapshot.data['module']);
  meta = computed(() => META[this.module()]);
  items = signal<any[] | null>(null);
  error = signal('');
  levels = computed(() => [...new Set((this.items() ?? []).map(i => i.level_id))].sort());
  byLevel(l: number) { return (this.items() ?? []).filter(i => i.level_id === l); }
  ngOnInit() { this.load(); }
  async load() { this.error.set(''); try { this.items.set(await this.api.get<any[]>(this.meta().api)); } catch (e: any) { this.error.set(e.message); } }
}
