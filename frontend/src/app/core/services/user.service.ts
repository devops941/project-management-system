import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from './api.types';
import { User, UserPayload } from '../models/user.model';
import { RoleInfo } from '../models/auth.model';

export interface UserQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/users`;

  list(query: UserQuery = {}): Observable<PaginatedResponse<User>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedResponse<User>>(this.api, { params });
  }

  get(id: string): Observable<{ success: boolean; data: { user: User } }> {
    return this.http.get<{ success: boolean; data: { user: User } }>(`${this.api}/${id}`);
  }

  create(payload: UserPayload): Observable<{ success: boolean; data: { user: User } }> {
    return this.http.post<{ success: boolean; data: { user: User } }>(this.api, payload);
  }

  update(id: string, payload: Partial<UserPayload>): Observable<{ success: boolean; data: { user: User } }> {
    return this.http.put<{ success: boolean; data: { user: User } }>(`${this.api}/${id}`, payload);
  }

  toggleStatus(id: string): Observable<{ success: boolean; data: { user: User } }> {
    return this.http.patch<{ success: boolean; data: { user: User } }>(`${this.api}/${id}/status`, {});
  }

  remove(id: string): Observable<{ success: boolean; data: { message: string } }> {
    return this.http.delete<{ success: boolean; data: { message: string } }>(`${this.api}/${id}`);
  }

  roles(): Observable<{ success: boolean; data: RoleInfo[] }> {
    return this.http.get<{ success: boolean; data: RoleInfo[] }>(`${environment.apiUrl}/auth/roles`);
  }
}
