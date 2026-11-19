import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api.service';
import { Icon } from '../../shared/icon';
import { ProgressBar } from '../../shared/progress-bar';
import { AnswerInput } from '../../shared/answer-input';
import { ItemResults, ScoreBanner } from '../../shared/item-results';
import { ErrorView, Loading } from '../../shared/state-view';

@Component({
  selector: 'fp-exam-runner',
  imports: [RouterLink, FormsModule, Icon, ProgressBar, AnswerInput, ItemResults, ScoreBanner, Loading, ErrorView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.ctx { white-space: pre-wrap; font-size: 18px; line-height: 1.6 } .sk { display:grid; grid-template-columns: 1fr 120px 48px; gap: 12px; align-items:center }`],
  template: `
  <div class="page stack">
    <a class="icon-btn" routerLink="/exams" aria-label="Back to exams"><fp-icon name="left" /></a>
    @if (error()) { <fp-error [message]="error()" (retry)="load()" /> }
    @else if (!a()) { <fp-loading /> }
    @else if (report(); as r) {
      <h1>{{ title() }} report</h1>
      <fp-score-banner [score]="r.totalScore" label="Total score (out of 100)" />
      @if (r.promotion?.promoted) { <p class="notice notice-ok">🎉 You moved up to Level {{ r.promotion.newLevel }}! All four exams are at 75% or more.</p> }
      @else if (r.promotion?.missing?.length) { <p class="notice small">To reach the next level, score 75%+ in: {{ r.promotion.missing.join(', ') }}.</p> }
      @for (n of r.notes; track n) { <p class="notice notice-warn small">{{ n }}</p> }
      <section class="card stack-sm"><h3>Skill scores</h3>
        @for (s of skills(); track s.k) { <div class="sk"><span class="break">{{ s.k.replace('-', ' ') }}</span><fp-progress [value]="s.v.percent" [label]="s.k" /><span class="small">{{ s.v.percent }}%</span></div> }</section>
      <div class="grid-2">
        <section class="card stack-sm"><h3>Strengths</h3>@for (s of r.strengths; track s) { <p class="small">✓ {{ s.replace('-', ' ') }}</p> } @empty { <p class="small muted">Keep practising — strengths will show here.</p> }</section>
        <section class="card stack-sm"><h3>Needs work</h3>@for (s of r.weaknesses; track s) { <p class="small">• {{ s.replace('-', ' ') }}</p> } @empty { <p class="small muted">No weak areas. Excellent!</p> }</section>
      </div>
      <section class="card stack-sm"><h3>Recommendations</h3>@for (s of r.recommendations; track s) { <p class="small">{{ s }}</p> }</section>
      <section class="card stack-sm"><h3>Next practice plan</h3><ol class="small" style="margin:0;padding-left:20px">@for (s of r.nextPlan; track s) { <li>{{ s }}</li> }</ol></section>
      <h2>Incorrect answers ({{ r.incorrect.length }})</h2>
      <fp-item-results [items]="r.incorrect" />
      <h2>Correct answers ({{ r.correct.length }})</h2>
      <fp-item-results [items]="r.correct" />
      <a class="btn btn-block btn-lg" routerLink="/exams">Back to exams</a>
    } @else {
      @let qs = a().questions;
      <div class="stack-sm"><h1>{{ title() }}</h1>
        <div class="row-between"><span class="small muted">Question {{ i() + 1 }} of {{ qs.length }} · {{ qs[i()].marks }} marks</span></div>
        <fp-progress [value]="i() + 1" [max]="qs.length" label="Exam progress" /></div>
      @if (a().note) { <p class="notice small">{{ a().note }}</p> }
      @let q = qs[i()];
      @if (q.context) { <div class="card-2 ctx break">{{ q.context }}</div> }
      <div class="card stack">
        <p style="font-size:var(--t-lg);font-weight:600" class="break" id="eq">{{ q.prompt }}</p>
        @if (q.kind === 'mcq') {
          <div class="options" role="radiogroup" aria-labelledby="eq">@for (o of q.options; track o) { <button type="button" class="option" role="radio" [attr.aria-checked]="answers()[q.id] === o" (click)="set(q.id, o)">{{ o }}</button> }</div>
        } @else {
          <fp-answer [label]="q.kind === 'free' ? 'Your answer' : 'Type the answer'" [multiline]="q.kind === 'free'" [voice]="a().examType === 'speak'" [value]="answers()[q.id] ?? ''" (valueChange)="set(q.id, $event)" />
        }
      </div>
      <div class="row">
        <button class="btn btn-ghost" type="button" (click)="i.set(i() - 1)" [disabled]="i() === 0" aria-label="Previous question"><fp-icon name="left" /></button>
        @if (i() < qs.length - 1) { <button class="btn grow" type="button" (click)="i.set(i() + 1)">Next</button> }
        @else { <button class="btn grow" type="button" (click)="submit()" [disabled]="busy()">{{ busy() ? 'Marking…' : 'Submit exam (' + answered() + '/' + qs.length + ' answered)' }}</button> }
      </div>
      @if (submitError()) { <p class="notice notice-bad" role="alert">{{ submitError() }}</p> }
    }
  </div>`,
})
export class ExamRunner implements OnInit {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  id = this.route.snapshot.paramMap.get('id')!;
  a = signal<any>(null);
  report = signal<any>(null);
  error = signal(''); submitError = signal('');
  busy = signal(false);
  i = signal(0);
  answers = signal<Record<string, string>>(this.restore());
  answered = computed(() => Object.values(this.answers()).filter(v => v?.trim()).length);
  title = computed(() => ({ read: 'Read exam', write: 'Write exam', speak: 'Speak exam', lesson: 'Lesson exam' } as any)[this.a()?.examType] ?? 'Exam');
  skills = computed(() => Object.entries(this.report()?.skills ?? {}).map(([k, v]) => ({ k, v: v as any })));

  ngOnInit() { this.load(); }
  async load() {
    this.error.set('');
    try { const a: any = await this.api.get(`/exams/${this.id}`); this.a.set(a); if (a.report) this.report.set(a.report); }
    catch (e: any) { this.error.set(e.message); }
  }
  set(qid: string, v: string) { this.answers.update(a => ({ ...a, [qid]: v })); try { sessionStorage.setItem('fp-exam-' + this.id, JSON.stringify(this.answers())); } catch { /* ignore */ } }
  private restore() { try { return JSON.parse(sessionStorage.getItem('fp-exam-' + this.route.snapshot.paramMap.get('id')) ?? '{}'); } catch { return {}; } }
  async submit() {
    if (this.answered() < this.a().questions.length && !confirm(`You answered ${this.answered()} of ${this.a().questions.length} questions. Submit anyway?`)) return;
    this.busy.set(true); this.submitError.set('');
    try { this.report.set(await this.api.post(`/exams/${this.id}/submit`, { answers: this.answers() })); window.scrollTo({ top: 0 }); try { sessionStorage.removeItem('fp-exam-' + this.id); } catch { /* ignore */ } }
    catch (e: any) { this.submitError.set(e.message); }
    finally { this.busy.set(false); }
  }
}
