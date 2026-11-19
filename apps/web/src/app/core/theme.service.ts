import { Injectable, signal } from '@angular/core';
export type Theme = 'system' | 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.read());
  private read(): Theme { try { const t = localStorage.getItem('fp-theme'); return t === 'light' || t === 'dark' ? t : 'system'; } catch { return 'system'; } }
  set(t: Theme) {
    this.theme.set(t);
    try { t === 'system' ? localStorage.removeItem('fp-theme') : localStorage.setItem('fp-theme', t); } catch { /* storage blocked */ }
    if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  }
}
