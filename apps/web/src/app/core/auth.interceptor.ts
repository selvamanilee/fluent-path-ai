import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { Auth } from './auth.service';

const withToken = (req: HttpRequest<unknown>, token: string | null) => (token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);

/** Adds the Bearer token; on 401 performs one (shared) refresh and retries once. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (req.url.includes('/auth/')) return next(req);
  return next(withToken(req, auth.token())).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) return throwError(() => err);
      return from(auth.refresh()).pipe(switchMap(ok => {
        if (!ok) { router.navigateByUrl('/login'); return throwError(() => err); }
        return next(withToken(req, auth.token()));
      }));
    }),
  );
};
