import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(Auth), router = inject(Router);
  if (!(await auth.restore()) && !auth.signedIn()) return router.parseUrl('/welcome');
  if (!auth.user()?.onboarded) return router.parseUrl('/onboarding');
  return true;
};

export const onboardingGuard: CanActivateFn = async () => {
  const auth = inject(Auth), router = inject(Router);
  await auth.restore();
  if (!auth.signedIn()) return router.parseUrl('/welcome');
  return auth.user()?.onboarded ? router.parseUrl('/') : true;
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(Auth), router = inject(Router);
  await auth.restore();
  return auth.signedIn() ? router.parseUrl(auth.user()?.onboarded ? '/' : '/onboarding') : true;
};
