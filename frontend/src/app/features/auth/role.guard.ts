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

  // Not '/' - it redirects to /dashboard (app.routes.ts), which a plain
  // USER (denied here) can't reach either since restricting it to ADMIN/
  // PLATFORM_ADMIN - that would loop right back through this same guard.
  // /clients has no role restriction at all, safe for every authenticated
  // role.
  return router.createUrlTree(['/clients']);
};
