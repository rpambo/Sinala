import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { IncidentService } from '../services/incident.service';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const incidents = inject(IncidentService);
  const router = inject(Router);
  try {
    const user = await auth.refreshSession();
    if (user?.role !== 'ADMIN') return router.createUrlTree(['/auth']);
    await incidents.loadAdmin().catch(() => undefined);
    return true;
  } catch {
    return router.createUrlTree(['/auth']);
  }
};

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    return await auth.refreshSession()
      ? true
      : router.createUrlTree(['/auth']);
  } catch {
    return router.createUrlTree(['/auth']);
  }
};
