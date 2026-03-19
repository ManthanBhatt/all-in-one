import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { SessionStore } from './session.store';

export const featureGuard = (featureKey: string): CanActivateFn => {
  return async () => {
    const sessionStore = inject(SessionStore);
    const authService = inject(AuthService);
    const router = inject(Router);

    if (sessionStore.isLoading()) {
      await authService.restoreSession();
    }

    if (!sessionStore.isAuthenticated()) {
      return router.createUrlTree(['/auth/login']);
    }

    const enabledFeatures = sessionStore.session().profile?.enabled_features ?? [];
    
    if (enabledFeatures.includes(featureKey)) {
      return true;
    }

    // If the requested feature is disabled, try to go to the first enabled feature
    if (enabledFeatures.length > 0) {
      // Avoid redirecting to dashboard if we are already guarding dashboard to prevent loops
      if (featureKey !== 'dashboard' && enabledFeatures.includes('dashboard')) {
        return router.createUrlTree(['/app/dashboard']);
      }
      
      // Fallback to the first enabled feature that isn't the current one (if possible)
      const fallback = enabledFeatures.find(f => f !== featureKey);
      if (fallback) {
        return router.createUrlTree([`/app/${fallback}`]);
      }
    }

    // Ultimate fallback to settings which is always available
    return router.createUrlTree(['/app/settings']);
  };
};
