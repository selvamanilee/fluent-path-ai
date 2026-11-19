import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Pwa } from './core/pwa.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`.banner { position: fixed; left: 50%; transform: translateX(-50%); z-index: 50; width: min(560px, calc(100% - 32px));
    bottom: calc(var(--tabbar-h) + 12px + var(--safe-bottom)); display:flex; align-items:center; gap: 12px; padding: 10px 10px 10px 18px;
    border-radius: 20px; background: var(--text); color: var(--bg); box-shadow: 0 8px 30px rgba(0,0,0,.25) }
    .top { top: calc(8px + var(--safe-top)); bottom: auto; background: var(--warn-soft); color: var(--text) }`],
  template: `
    @if (!pwa.online()) { <div class="banner top small" role="status">You're offline. Saved lessons still open; answers will be checked when you reconnect.</div> }
    @if (pwa.updateReady()) {
      <div class="banner" role="status"><span class="grow small">A new version of FluentPath is ready.</span>
        <button class="btn" style="min-height:40px;padding:8px 16px" type="button" (click)="pwa.applyUpdate()">Update</button></div>
    }
    <router-outlet />`,
})
export class App implements OnInit {
  pwa = inject(Pwa);
  ngOnInit() { this.pwa.init(); }
}
