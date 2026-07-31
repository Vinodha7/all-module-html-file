import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // Check module permission if set in route data
  const module = route.data?.['module'];
  if (module && !authService.hasPermission(module)) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
