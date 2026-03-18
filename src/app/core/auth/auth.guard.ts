import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { SessionStore } from './session.store';

export const authGuard: CanActivateFn = async () => {
  const sessionStore = inject(SessionStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (sessionStore.isLoading()) {
    await authService.restoreSession();
  }

  return sessionStore.isAuthenticated() ? true : router.createUrlTree(['/auth/login']);
};
