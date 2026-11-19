import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { Icon } from '../../shared/icon';
import { ErrorView, Loading } from '../../shared/state-view';
import { ReadingActivity } from '../activities/reading';
import { WritingActivity } from '../activities/writing';
import { TurnsActivity } from '../activities/turns';
import { LessonActivity } from '../activities/lesson';

const API: Record<string, string> = { read: '/reading', write: '/writing', speak: '/speaking', technical: '/technical', lesson: '/lessons' };
const BACK: Record<string, string> = { read: '/read', write: '/write', speak: '/speak', technical: '/technical', lesson: '/lesson' };

/** Standalone exercise page for the Read / Write / Speak / Lesson / Technical hubs. */
@Component({
  selector: 'fp-exercise',
  imports: [RouterLink, Icon, Loading, ErrorView, ReadingActivity, WritingActivity, TurnsActivity, LessonActivity],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="page stack">
    <a class="icon-btn" [routerLink]="back" aria-label="Back"><fp-icon name="left" /></a>
    @if (error()) { <fp-error [message]="error()" (retry)="load()" /> }
    @else if (!c()) { <fp-loading /> }
    @else {
      @let x = c();
      @switch (module) {
        @case ('read') { <fp-reading-activity [content]="x" [submitFn]="submitList" continueLabel="Back to Read" (finished)="router.navigateByUrl(back)" /> }
        @case ('write') { <fp-writing-activity [content]="x" [submitFn]="submitWriting" continueLabel="Back to Write" (finished)="router.navigateByUrl(back)" /> }
        @case ('lesson') { <h1 class="break">{{ x.title }}</h1>@if (x.source === 'ai') { <span class="tag tag-accent" style="align-self:flex-start">AI-generated lesson</span> }
          <fp-lesson-activity [content]="x" [submitFn]="submitList" continueLabel="Back to lessons" (finished)="router.navigateByUrl(back)" /> }
        @default {
          <h1 class="break">{{ x.title }}</h1>
          <fp-turns-activity [content]="x" [submitFn]="finishTurns" [turnFn]="turn" continueLabel="Back" (finished)="router.navigateByUrl(back)" />
        }
      }
    }
  </div>`,
})
export class Exercise implements OnInit {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  router = inject(Router);
  module = this.route.snapshot.data['module'] as string;
  id = this.route.snapshot.paramMap.get('id')!;
  back = BACK[this.module];
  c = signal<any>(null);
  error = signal('');
  private lastSummary: any = null;

  ngOnInit() { this.load(); }
  async load() { this.error.set(''); try { this.c.set(await this.api.get(`${API[this.module]}/${this.id}`)); } catch (e: any) { this.error.set(e.message); } }

  submitList = (answers: string[]) => this.api.post(`${API[this.module]}/${this.id}/submit`, { answers });
  submitWriting = (a: { text: string }) => this.api.post(`/writing/${this.id}/submit`, { text: a.text });
  turn = async (index: number, transcript: string, inputMode: 'text' | 'voice') => {
    const r: any = await this.api.post(`${API[this.module]}/${this.id}/turn`, { index, transcript, inputMode });
    if (r.summary) this.lastSummary = r.summary;
    return r;
  };
  // Practice sessions are saved on the last turn; this just returns the session summary.
  finishTurns = async () => ({ score: this.lastSummary?.score ?? 0 });
}
