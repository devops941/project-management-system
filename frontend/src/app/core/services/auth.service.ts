import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginResponse, Role } from '../models/auth.model';

const TOKEN_KEY = 'pms_token';
const USER_KEY = 'pms_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = `${environment.apiUrl}/auth`;

  private readonly userSubject = new BehaviorSubject<AuthUser | null>(this.readStoredUser());
  readonly user$ = this.userSubject.asObservable();

  login(email: string, password: string): Observable<{ success: boolean; data: LoginResponse }> {
    return this.http
      .post<{ success: boolean; data: LoginResponse }>(`${this.api}/login`, { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
          this.userSubject.next(res.data.user);
        }),
      );
  }

  logout(): void {
    this.http.post(`${this.api}/logout`, {}).subscribe({ error: () => undefined });
    this.clearSession();
    this.router.navigate(['/login']);
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSubject.next(null);
  }

  refreshProfile(): Observable<{ success: boolean; data: { user: AuthUser } }> {
    return this.http
      .get<{ success: boolean; data: { user: AuthUser } }>(`${this.api}/me`)
      .pipe(
        tap((res) => {
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
          this.userSubject.next(res.data.user);
        }),
      );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<unknown> {
    return this.http.post(`${this.api}/change-password`, { currentPassword, newPassword });
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get currentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  get role(): Role | null {
    return this.currentUser?.role ?? null;
  }

  hasRole(...roles: Role[]): boolean {
    const role = this.role;
    return !!role && roles.includes(role);
  }

  isAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  isManager(): boolean {
    return this.role === 'ADMIN' || this.role === 'MANAGER';
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
