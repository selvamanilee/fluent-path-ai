import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthResponse, User } from './models';
import { toApiError } from './api.service';

/** Access token lives only in memory; the refresh token is an httpOnly cookie the JS can't read. */
@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  private router = inject(Router);
  readonly user = signal<User | null>(null);
  readonly token = signal<string | null>(null);
  readonly signedIn = computed(() => !!this.user());
  private refreshing: Promise<boolean> | null = null;
  private restored: Promise<boolean> | null = null;

  /** Restore the session once on app start (via refresh cookie). */
  restore(): Promise<boolean> {
    return (this.restored ??= this.refresh());
  }

  refresh(): Promise<boolean> {
    return (this.refreshing ??= firstValueFrom(this.http.post<{ data: AuthResponse }>('/api/v1/auth/refresh', {}, { withCredentials: true }))
      .then(r => { this.set(r.data); return true; })
      .catch(() => { this.clear(); return false; })
      .finally(() => (this.refreshing = null)));
  }

  async login(email: string, password: string) { return this.authCall('/api/v1/auth/login', { email, password }); }
  async register(displayName: string, email: string, password: string) { return this.authCall('/api/v1/auth/register', { displayName, email, password }); }

  private async authCall(url: string, body: unknown) {
    try {
      const r = await firstValueFrom(this.http.post<{ data: AuthResponse }>(url, body, { withCredentials: true }));
      this.set(r.data);
      this.restored = Promise.resolve(true);
      return r.data.user;
    } catch (e) {
      throw toApiError(e);
    }
  }

  markOnboarded() { const u = this.user(); if (u) this.user.set({ ...u, onboarded: true }); }
  setName(displayName: string) { const u = this.user(); if (u) this.user.set({ ...u, displayName }); }

  async logout() {
    try { await firstValueFrom(this.http.post('/api/v1/auth/logout', {}, { withCredentials: true })); } catch { /* offline: still clear locally */ }
    this.clear();
    this.restored = Promise.resolve(false);
    await this.router.navigateByUrl('/welcome');
  }

  clear() { this.user.set(null); this.token.set(null); }
  private set(r: AuthResponse) { this.token.set(r.accessToken); this.user.set(r.user); }
}
