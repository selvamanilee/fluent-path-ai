import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Injectable({ providedIn: 'root' })
export class Pwa {
  private sw = inject(SwUpdate);
  readonly updateReady = signal(false);
  readonly installable = signal(false);
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  private deferred: any = null;

  readonly isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  readonly isAndroid = /android/i.test(navigator.userAgent);
  readonly standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;

  init() {
    window.addEventListener('beforeinstallprompt', (e: Event) => { e.preventDefault(); this.deferred = e; this.installable.set(true); });
    window.addEventListener('appinstalled', () => { this.installable.set(false); this.deferred = null; });
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
    if (this.sw.isEnabled) {
      this.sw.versionUpdates.subscribe(e => { if (e.type === 'VERSION_READY') this.updateReady.set(true); });
      setInterval(() => this.sw.checkForUpdate().catch(() => {}), 30 * 60_000);
    }
  }

  async install() {
    if (!this.deferred) return;
    this.deferred.prompt();
    await this.deferred.userChoice;
    this.deferred = null; this.installable.set(false);
  }

  async applyUpdate() {
    await this.sw.activateUpdate().catch(() => {});
    location.reload();
  }
}
