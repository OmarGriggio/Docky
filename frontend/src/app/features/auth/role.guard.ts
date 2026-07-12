import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from '../../shared/models/auth';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const roles = route.data['roles'] as UserRole[];
  const user = auth.currentUser();

  if (user && roles.includes(user.role)) {
    return true;
  }

  return router.createUrlTree(['/']);
};
