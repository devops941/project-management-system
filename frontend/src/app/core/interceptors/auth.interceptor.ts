import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationToastService } from '../services/toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq);
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(NotificationToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/login')) {
        auth.clearSession();
        toast.error('Your session has expired. Please sign in again.');
      }
      return throwError(() => error);
    }),
  );
};

// Extracts a human-readable message from the backend's error envelope.
export function extractErrorMessage(error: unknown): string {
  const httpError = error as HttpErrorResponse;
  const body = httpError?.error;

  if (body?.details && Array.isArray(body.details) && body.details.length) {
    return body.details.map((d: { message: string }) => d.message).join(', ');
  }
  if (body?.message) return body.message;
  if (httpError?.message) return httpError.message;
  return 'Something went wrong. Please try again.';
}
