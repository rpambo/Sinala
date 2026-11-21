import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      const isAuthEndpoint = request.url.includes('/auth/');
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthEndpoint && !router.url.startsWith('/auth')) {
        auth.clearSessionLocally('A sua sessão expirou. Inicie sessão novamente.');
        const returnUrl = router.url === '/' ? undefined : router.url;
        void router.navigate(['/auth'], { queryParams: returnUrl ? { returnUrl } : undefined });
      }
      return throwError(() => error);
    }),
  );
};
