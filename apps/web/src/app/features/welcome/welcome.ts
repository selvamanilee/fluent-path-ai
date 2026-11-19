import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'fp-welcome',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display:block; min-height: 100dvh; background: #141414; color: #fff; }
    .wrap { min-height: 100dvh; max-width: 520px; margin: 0 auto; display: flex; flex-direction: column;
      padding: calc(32px + var(--safe-top)) calc(24px + var(--safe-right)) calc(24px + var(--safe-bottom)) calc(24px + var(--safe-left)); overflow: hidden; }
    h1 { font-size: clamp(44px, 13vw, 64px); line-height: 1.05; letter-spacing: -0.03em; }
    h1 span { color: #7a6ff0; display: block; }
    .tagline { color: #b9b5cc; font-size: 18px; margin-top: 12px; }
    .art { position: relative; flex: 1; min-height: 260px; margin: 24px 0; }
    .s { position: absolute; border-radius: 999px; }
    .p { background: #6e62e5; } .k { background: #f9d5fb; }
    .s1 { width: 30%; height: 62%; left: 0; bottom: 0; } .s2 { width: 30%; height: 50%; left: 35%; top: 12%; }
    .s3 { width: 30%; aspect-ratio: 1; left: 35%; bottom: 0; } .s4 { width: 34%; aspect-ratio: 1; right: -12%; top: 0; }
    .s5 { width: 28%; height: 64%; right: -6%; bottom: 0; }
    .actions { display: flex; flex-direction: column; gap: 12px; }
    .ghost { color: #fff; background: #2a2a2e; }
    @media (prefers-reduced-motion: no-preference) { .s { animation: rise 700ms var(--ease) both; } .s2 { animation-delay: 80ms } .s3 { animation-delay: 160ms } .s4 { animation-delay: 240ms } .s5 { animation-delay: 320ms } }
    @keyframes rise { from { transform: translateY(24px); opacity: 0 } }
  `],
  template: `
  <div class="wrap">
    <h1>Empower<br />Your <span>English</span></h1>
    <p class="tagline">Learn. Practice. Speak. Improve.<br />Your personal English communication coach — with Tamil help when you need it.</p>
    <div class="art" aria-hidden="true">
      <span class="s p s1"></span><span class="s p s2"></span><span class="s k s3"></span><span class="s k s4"></span><span class="s p s5"></span>
    </div>
    <div class="actions">
      <a class="btn btn-lg btn-block" routerLink="/register">Start learning</a>
      <a class="btn btn-lg btn-block ghost" routerLink="/login">I already have an account</a>
    </div>
  </div>`,
})
export class Welcome {}
