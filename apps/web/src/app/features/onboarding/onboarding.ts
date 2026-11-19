import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Api } from '../../core/api.service';
import { Auth } from '../../core/auth.service';
import { Icon } from '../../shared/icon';
import { ProgressBar } from '../../shared/progress-bar';

const SKILLS = ['C#', '.NET', 'Angular', 'React', 'TypeScript', 'SQL', 'REST APIs', 'Azure', 'AI', 'Agentic AI', 'Java', 'Python'];
const CHALLENGES = ['Sentence formation', 'Grammar', 'Vocabulary', 'Fluency', 'Professional communication', 'Pronunciation', 'Confidence'];

@Component({
  selector: 'fp-onboarding',
  imports: [ReactiveFormsModule, Icon, ProgressBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.mod { display:grid; grid-template-columns: 48px 1fr; gap: 12px; align-items:center } .mod .i { width:48px;height:48px;border-radius:16px;display:grid;place-items:center;background:var(--accent);color:#fff }
    .mod:nth-child(2n) .i { background: var(--pink); color: var(--pink-ink) } fieldset { border: 0; padding: 0; margin: 0 } legend { font-weight: 600; font-size: var(--t-sm); margin-bottom: 8px }`],
  template: `
  <div class="page stack-lg" style="max-width:560px">
    <div class="stack-sm">
      <div class="row-between"><span class="muted small">Step {{ step() + 1 }} of 5</span>
        @if (step() > 0) { <button type="button" class="link" (click)="step.set(step() - 1)">Back</button> }</div>
      <fp-progress [value]="step() + 1" [max]="5" label="Onboarding progress" />
    </div>
    <form [formGroup]="form" (ngSubmit)="finish()" class="stack-lg">
    @switch (step()) {
      @case (0) {
        <div class="stack"><h1>Vanakkam, {{ auth.user()?.displayName }}! 👋</h1>
          <p>FluentPath AI is your personal English coach. In 30 minutes a day, you will learn new words, grammar, reading, writing and speaking — step by step, from the very beginning.</p>
          <p class="ta muted" lang="ta">ஒவ்வொரு நாளும் 30 நிமிடங்களில் ஆங்கிலம் கற்றுக்கொள்ளுங்கள். தேவைப்படும்போது தமிழில் விளக்கம் கிடைக்கும்.</p>
          <div class="card-2 stack-sm"><strong>How it works</strong>
            <p class="small">1. One activity at a time. 2. You answer first — we never show answers before you try. 3. We correct your sentences and explain why. 4. We remind you to revise at the right time.</p></div></div>
      }
      @case (1) {
        <div class="stack"><h2>About you</h2>
          <div class="field"><label for="dn">Your name</label><input id="dn" class="input" formControlName="displayName" autocomplete="name" /></div>
          <div class="field"><label for="nl">Native language</label><input id="nl" class="input" formControlName="nativeLanguage" /></div>
          <div class="field"><label for="pb">Your work / role</label><input id="pb" class="input" formControlName="professionalBackground" /><p class="hint">Used to make examples relevant to your job.</p></div>
          <fieldset><legend>Technical skills</legend><div class="row wrap">
            @for (s of skills; track s) { <button type="button" class="pill" [attr.aria-pressed]="has('technicalSkills', s)" (click)="toggle('technicalSkills', s)">{{ s }}</button> }</div></fieldset>
          <div class="field"><label for="co">Career goal</label><input id="co" class="input" formControlName="careerObjective" /></div>
        </div>
      }
      @case (2) {
        <div class="stack"><h2>Your learning plan</h2>
          <fieldset><legend>Daily learning time</legend><div class="row wrap">
            @for (m of [15, 30, 45, 60]; track m) { <button type="button" class="pill" [attr.aria-pressed]="form.value.dailyMinutes === m" (click)="form.patchValue({ dailyMinutes: m })">{{ m }} min</button> }</div>
            <p class="hint" style="margin-top:6px">30 minutes is recommended.</p></fieldset>
          <fieldset><legend>Tamil explanations</legend><div class="stack-sm">
            @for (o of tamilOptions; track o.v) { <button type="button" class="option" role="radio" [attr.aria-checked]="form.value.tamilSupport === o.v" (click)="form.patchValue({ tamilSupport: o.v })"><strong>{{ o.t }}</strong><br /><span class="small muted">{{ o.d }}</span></button> }</div></fieldset>
          <fieldset><legend>What is hard for you?</legend><div class="row wrap">
            @for (c of challenges; track c) { <button type="button" class="pill" [attr.aria-pressed]="has('challenges', c)" (click)="toggle('challenges', c)">{{ c }}</button> }</div></fieldset>
        </div>
      }
      @case (3) {
        <div class="stack"><h2>Your English level</h2>
          <p class="muted">Everyone starts from the basics unless you already know them. You move up only after passing assessments (75%).</p>
          <div class="stack-sm">
            @for (l of levels; track l.v) { <button type="button" class="option" role="radio" [attr.aria-checked]="form.value.startLevel === l.v" (click)="form.patchValue({ startLevel: l.v })"><strong>{{ l.t }}</strong><br /><span class="small muted">{{ l.d }}</span></button> }
          </div></div>
      }
      @case (4) {
        <div class="stack"><h2>Your four skills</h2>
          @for (m of modules; track m.t) { <div class="mod card"><span class="i"><fp-icon [name]="m.i" /></span><div><strong>{{ m.t }}</strong><p class="small muted">{{ m.d }}</p></div></div> }
          <p class="notice">Day 1: greetings, 10 basic words, 5 daily phrases, "am / is / are", a short reading, a writing task, a speaking chat and a small quiz.</p>
        </div>
      }
    }
    @if (error()) { <p class="notice notice-bad" role="alert">{{ error() }}</p> }
    @if (step() < 4) { <button class="btn btn-lg btn-block" type="button" (click)="nextStep()">Continue</button> }
    @else { <button class="btn btn-lg btn-block" type="submit" [disabled]="busy()">{{ busy() ? 'Preparing Day 1…' : 'Start Day 1' }}</button> }
    </form>
  </div>`,
})
export class Onboarding {
  auth = inject(Auth);
  private api = inject(Api);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  step = signal(0);
  busy = signal(false);
  error = signal('');
  skills = SKILLS;
  challenges = CHALLENGES;
  tamilOptions: { v: 'when_needed' | 'always' | 'off'; t: string; d: string }[] = [
    { v: 'when_needed', t: 'When needed (recommended)', d: 'Tamil for difficult points; more English as you improve.' },
    { v: 'always', t: 'Always', d: 'Tamil explanation for every lesson and correction.' },
    { v: 'off', t: 'English only', d: 'No Tamil explanations.' },
  ];
  levels = [
    { v: 1, t: 'Absolute beginner (recommended)', d: 'I know very little English.' },
    { v: 2, t: 'Basic', d: 'I can make simple sentences like "I am a developer."' },
    { v: 3, t: 'Elementary', d: 'I can have short conversations about my day.' },
  ];
  modules = [
    { i: 'book', t: 'Read', d: 'Short passages with word meanings and questions.' },
    { i: 'pen', t: 'Write', d: 'Write on your own; we correct and explain.' },
    { i: 'mic', t: 'Speak', d: 'One question at a time. Speak or type.' },
    { i: 'cap', t: 'Lesson', d: 'Grammar from the alphabet to business English.' },
  ];
  form = this.fb.nonNullable.group({
    displayName: [this.auth.user()?.displayName ?? '', Validators.required],
    nativeLanguage: ['Tamil', Validators.required],
    professionalBackground: ['Full Stack Developer / Application Lead / Technical Lead'],
    technicalSkills: [['C#', '.NET', 'Angular', 'React', 'TypeScript', 'SQL', 'REST APIs', 'Azure', 'AI', 'Agentic AI']],
    careerObjective: ['Confident Technical Lead and future Solution Architect'],
    challenges: [['Sentence formation', 'Grammar', 'Vocabulary', 'Fluency', 'Professional communication']],
    dailyMinutes: [30],
    tamilSupport: ['when_needed' as 'when_needed' | 'always' | 'off'],
    learningMethod: ['Interactive conversation'],
    priority: ['Speaking and professional communication'],
    startLevel: [1],
  });

  has(k: 'technicalSkills' | 'challenges', v: string) { return this.form.controls[k].value.includes(v); }
  toggle(k: 'technicalSkills' | 'challenges', v: string) {
    const cur = this.form.controls[k].value;
    this.form.controls[k].setValue(cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]);
  }
  nextStep() {
    if (this.step() === 1 && !this.form.value.displayName?.trim()) { this.error.set('Please enter your name.'); return; }
    this.error.set(''); this.step.update(s => s + 1);
  }

  async finish() {
    this.busy.set(true); this.error.set('');
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    try {
      await this.api.post('/onboarding', { ...this.form.getRawValue(), timezone: tz });
      this.auth.markOnboarded(); this.auth.setName(this.form.value.displayName!);
      await this.router.navigateByUrl('/daily');
    } catch (e: any) { this.error.set(e.message); }
    finally { this.busy.set(false); }
  }
}
