import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api.service';
import { Auth } from '../../core/auth.service';
import { Pwa } from '../../core/pwa.service';
import { Speech } from '../../core/speech.service';
import { ThemeService, Theme } from '../../core/theme.service';
import { Icon } from '../../shared/icon';
import { ErrorView, Loading } from '../../shared/state-view';

@Component({
  selector: 'fp-settings',
  imports: [FormsModule, Icon, Loading, ErrorView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`ol { margin: 0; padding-left: 20px } li { margin-bottom: 6px }`],
  template: `
  <div class="page stack-lg">
    <h1>Settings</h1>
    @if (error()) { <fp-error [message]="error()" (retry)="load()" /> }
    @else if (!me()) { <fp-loading /> }
    @else {
      <form class="card stack" (ngSubmit)="saveProfile()">
        <h2 style="font-size:var(--t-lg)">Profile</h2>
        <div class="field"><label for="n">Name</label><input id="n" name="n" class="input" [(ngModel)]="profile.displayName" required /></div>
        <div class="field"><label for="nl">Native language</label><input id="nl" name="nl" class="input" [(ngModel)]="profile.nativeLanguage" /></div>
        <div class="field"><label for="dm">Daily learning time (minutes)</label><select id="dm" name="dm" class="select" [(ngModel)]="profile.dailyMinutes">@for (m of [15, 30, 45, 60, 90]; track m) { <option [ngValue]="m">{{ m }}</option> }</select></div>
        <div class="field"><label for="pb">Professional background</label><input id="pb" name="pb" class="input" [(ngModel)]="profile.professionalBackground" /></div>
        <div class="field"><label for="ts">Technical skills</label><input id="ts" name="ts" class="input" [(ngModel)]="skills" /><p class="hint">Separate with commas.</p></div>
        <div class="field"><label for="co">Career objective</label><input id="co" name="co" class="input" [(ngModel)]="profile.careerObjective" /></div>
        <div class="field"><label for="pr">Main priority</label><input id="pr" name="pr" class="input" [(ngModel)]="profile.priority" /></div>
        <p class="small muted">Current level: {{ me().profile.level_id }} · {{ me().profile.level_name }} (changes only through exams)</p>
        @if (saved()) { <p class="notice notice-ok" role="status">{{ saved() }}</p> }
        <button class="btn" type="submit" [disabled]="busy()">Save profile</button>
      </form>

      <section class="card stack">
        <h2 style="font-size:var(--t-lg)">Preferences</h2>
        <fieldset style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:8px">Theme</legend><div class="row wrap">
          @for (t of themes; track t.v) { <button type="button" class="pill" [attr.aria-pressed]="theme.theme() === t.v" (click)="setTheme(t.v)"><fp-icon [name]="t.i" [size]="18" />{{ t.l }}</button> }</div></fieldset>
        <fieldset style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:8px">Tamil explanations</legend><div class="row wrap">
          @for (o of tamil; track o.v) { <button type="button" class="pill" [attr.aria-pressed]="prefs.tamil_support === o.v" (click)="savePref({ tamilSupport: o.v }); prefs.tamil_support = o.v">{{ o.l }}</button> }</div></fieldset>
        <div class="field"><label for="sr">Speech speed: {{ prefs.speech_rate }}</label><input id="sr" type="range" min="0.5" max="1.3" step="0.1" [(ngModel)]="prefs.speech_rate" (change)="savePref({ speechRate: +prefs.speech_rate }); speech.rate = +prefs.speech_rate" /></div>
        <p class="small muted">Voice: speech playback {{ speech.canSpeak ? 'is available' : 'is not available' }} in this browser; voice input {{ speech.canListen ? 'is available' : 'is not available (type your answers)' }}.</p>
      </section>

      <section class="card stack-sm">
        <h2 style="font-size:var(--t-lg)">Install the app</h2>
        @if (pwa.standalone) { <p class="notice notice-ok">FluentPath is installed on this device.</p> }
        @else if (pwa.installable()) { <button class="btn" type="button" (click)="pwa.install()"><fp-icon name="download" />Install FluentPath</button> }
        @if (!pwa.standalone) {
          <div class="stack-sm"><strong>iPhone / iPad (Safari)</strong>
            <ol class="small"><li>Open FluentPath in <strong>Safari</strong>.</li><li>Tap the <strong>Share</strong> button <fp-icon name="share" [size]="16" style="display:inline-flex;vertical-align:middle" />.</li><li>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li></ol>
            <p class="xs muted">On iOS, installed web apps support offline lessons and speech playback. Voice input requires iOS 14.5+ and microphone permission; push notifications are limited.</p></div>
          <div class="stack-sm"><strong>Android (Chrome)</strong><ol class="small"><li>Tap the <strong>⋮</strong> menu.</li><li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li></ol></div>
          <div class="stack-sm"><strong>Desktop (Chrome / Edge)</strong><p class="small">Click the install icon in the address bar.</p></div>
        }
      </section>

      <section class="card stack-sm">
        <h2 style="font-size:var(--t-lg)">Privacy & data</h2>
        <p class="small">Voice input is converted to text by your browser. FluentPath does not upload or store voice recordings. Only your text answers and scores are saved.</p>
        <button class="btn btn-ghost" type="button" (click)="auth.logout()"><fp-icon name="logout" />Sign out</button>
        <details class="stack-sm"><summary class="small" style="cursor:pointer;min-height:44px;display:flex;align-items:center">Delete my account</summary>
          <p class="small">This permanently deletes your account, progress, scores and mistakes. This cannot be undone.</p>
          <div class="field"><label for="del">Type DELETE to confirm</label><input id="del" class="input" [(ngModel)]="confirmText" autocomplete="off" autocapitalize="characters" /></div>
          <button class="btn btn-danger" type="button" [disabled]="confirmText !== 'DELETE' || busy()" (click)="deleteAccount()"><fp-icon name="trash" />Delete account permanently</button>
        </details>
      </section>
      <p class="xs muted center">FluentPath AI · Learn. Practice. Speak. Improve.</p>
    }
  </div>`,
})
export class Settings implements OnInit {
  private api = inject(Api);
  auth = inject(Auth);
  pwa = inject(Pwa);
  speech = inject(Speech);
  theme = inject(ThemeService);
  me = signal<any>(null);
  error = signal('');
  saved = signal('');
  busy = signal(false);
  profile: any = {};
  prefs: any = {};
  skills = '';
  confirmText = '';
  themes: { v: Theme; l: string; i: string }[] = [{ v: 'system', l: 'System', i: 'settings' }, { v: 'light', l: 'Light', i: 'sun' }, { v: 'dark', l: 'Dark', i: 'moon' }];
  tamil = [{ v: 'when_needed', l: 'When needed' }, { v: 'always', l: 'Always' }, { v: 'off', l: 'English only' }];

  ngOnInit() { this.load(); }
  async load() {
    this.error.set('');
    try {
      const m: any = await this.api.get('/me');
      this.me.set(m);
      const p = m.profile;
      this.profile = { displayName: m.user.displayName, nativeLanguage: p.native_language, dailyMinutes: p.daily_minutes, professionalBackground: p.professional_background, careerObjective: p.career_objective, priority: p.priority };
      this.skills = (p.technical_skills ?? []).join(', ');
      this.prefs = { ...m.preferences, speech_rate: Number(m.preferences.speech_rate) };
      this.speech.rate = this.prefs.speech_rate;
    } catch (e: any) { this.error.set(e.message); }
  }
  async saveProfile() {
    this.busy.set(true); this.saved.set('');
    try {
      await this.api.put('/me/profile', { ...this.profile, technicalSkills: this.skills.split(',').map(s => s.trim()).filter(Boolean) });
      this.auth.setName(this.profile.displayName); this.saved.set('Profile saved.');
    } catch (e: any) { this.saved.set(e.message); }
    finally { this.busy.set(false); }
  }
  async savePref(p: any) { try { await this.api.put('/me/preferences', p); } catch { /* shown on next load */ } }
  setTheme(t: Theme) { this.theme.set(t); this.savePref({ theme: t }); }
  async deleteAccount() {
    this.busy.set(true);
    try { await this.api.delete('/me', { confirm: 'DELETE' }); this.auth.clear(); location.href = '/welcome'; }
    catch (e: any) { this.error.set(e.message); this.busy.set(false); }
  }
}
