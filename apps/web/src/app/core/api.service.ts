import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiErrorBody } from './models';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: ApiErrorBody['details']) { super(message); }
}

/** Typed client for /api/v1 — unwraps the {data} envelope and turns failures into ApiError. */
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  readonly base = '/api/v1';

  get<T>(path: string, params?: Record<string, string | number>) { return this.req<T>('GET', path, undefined, params); }
  post<T>(path: string, body: unknown = {}) { return this.req<T>('POST', path, body); }
  put<T>(path: string, body: unknown) { return this.req<T>('PUT', path, body); }
  delete<T>(path: string, body?: unknown) { return this.req<T>('DELETE', path, body); }

  private async req<T>(method: string, path: string, body?: unknown, params?: Record<string, string | number>): Promise<T> {
    try {
      const res = await firstValueFrom(this.http.request<{ data: T }>(method, this.base + path, { body, params: params as any, withCredentials: true }));
      return res.data;
    } catch (e) {
      throw toApiError(e);
    }
  }
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return new ApiError(0, 'OFFLINE', 'You seem to be offline. Check your connection and try again.');
    const err = e.error?.error as ApiErrorBody | undefined;
    if (err) return new ApiError(e.status, err.code, err.message, err.details);
    return new ApiError(e.status, 'HTTP_' + e.status, e.status >= 500 ? 'The server had a problem. Please try again in a moment.' : 'Request failed.');
  }
  return new ApiError(0, 'UNKNOWN', 'Something went wrong. Please try again.');
}
