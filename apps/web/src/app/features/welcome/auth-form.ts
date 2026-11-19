import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../../core/auth.service';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'fp-auth-form',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.wrap { max-width: 440px; }`],
  template: `
  <div class="page wrap stack-lg">
    <a routerLink="/welcome" class="icon-btn" aria-label="Back"><fp-icon name="left" /></a>
    <div class="stack-sm"><h1>{{ register() ? 'Create your account' : 'Welcome back' }}</h1>
      <p class="muted">{{ register() ? 'It takes one minute. Your progress is saved to your account.' : 'Sign in to continue your learning.' }}</p></div>
    <form class="stack" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @if (register()) {
        <div class="field"><label for="name">Your name</label>
          <input id="name" class="input" formControlName="displayName" autocomplete="name" autocapitalize="words" [attr.aria-invalid]="bad('displayName')" aria-describedby="name-err" />
          @if (bad('displayName')) { <p class="error" id="name-err">Please enter your name.</p> }</div>
      }
      <div class="field"><label for="email">Email</label>
        <input id="email" class="input" type="email" inputmode="email" formControlName="email" autocomplete="email" autocapitalize="off" [attr.aria-invalid]="bad('email')" aria-describedby="email-err" />
        @if (bad('email')) { <p class="error" id="email-err">Enter a valid email, like name&#64;example.com.</p> }</div>
      <div class="field"><label for="pw">Password</label>
        <div class="row"><input id="pw" class="input grow" [type]="show() ? 'text' : 'password'" formControlName="password" [attr.autocomplete]="register() ? 'new-password' : 'current-password'" [attr.aria-invalid]="bad('password')" aria-describedby="pw-hint" />
          <button type="button" class="icon-btn" style="height:52px;width:52px" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Hide password' : 'Show password'" [attr.aria-pressed]="show()"><fp-icon name="sparkle" /></button></div>
        @if (bad('password')) { <p class="error" id="pw-hint">{{ register() ? 'Use at least 8 characters.' : 'Enter your password.' }}</p> }
        @else if (register()) { <p class="hint" id="pw-hint">At least 8 characters.</p> }</div>
      @if (error()) { <p class="notice notice-bad" role="alert">{{ error() }}</p> }
      <button class="btn btn-lg btn-block" type="submit" [disabled]="busy()">{{ busy() ? 'Please wait…' : register() ? 'Create account' : 'Sign in' }}</button>
    </form>
    <p class="center muted">
      @if (register()) { Already have an account? <a routerLink="/login" class="link">Sign in</a> }
      @else { New to FluentPath? <a routerLink="/register" class="link">Create an account</a> }
    </p>
  </div>`,
})
export class AuthForm {
  private auth = inject(Auth);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  register = computed(() => this.route.snapshot.data['mode'] === 'register');
  private route = inject(ActivatedRoute);
  busy = signal(false);
  error = signal('');
  show = signal(false);
  form = this.fb.nonNullable.group({
    displayName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    if (this.route.snapshot.data['mode'] === 'register') {
      this.form.controls.displayName.addValidators(Validators.required);
      this.form.controls.password.addValidators(Validators.minLength(8));
    }
    this.form.valueChanges.subscribe(() => this.error() && this.error.set(''));
  }

  bad(c: 'displayName' | 'email' | 'password') { const x = this.form.controls[c]; return x.invalid && (x.touched || x.dirty) ? true : null; }

  async submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    const v = this.form.getRawValue();
    try {
      const u = this.register() ? await this.auth.register(v.displayName.trim(), v.email.trim(), v.password) : await this.auth.login(v.email.trim(), v.password);
      await this.router.navigateByUrl(u.onboarded ? '/' : '/onboarding');
    } catch (e: any) { this.error.set(e.message); }
    finally { this.busy.set(false); }
  }
}
