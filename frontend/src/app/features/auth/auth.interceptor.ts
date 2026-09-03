import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Never try to refresh off a 401 from the auth endpoints themselves -
      // that would either loop (refresh failing) or make no sense (login).
      const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

      if (error.status === 401 && !isAuthEndpoint) {
        return authService.refreshAccessToken().pipe(
          switchMap(newToken => {
            const retriedReq = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
            return next(retriedReq);
          }),
          catchError(refreshError => {
            authService.logout();
            router.navigateByUrl('/login');
            return throwError(() => refreshError);
          })
        );
      }

      if (error.status === 401) {
        authService.logout();
        router.navigateByUrl('/login');
      }

      return throwError(() => error);
    })
  );
};
