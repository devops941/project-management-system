import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from './api.types';
import { AppNotification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/notifications`;

  list(query: { page?: number; limit?: number; unread?: boolean } = {}): Observable<PaginatedResponse<AppNotification>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));
    if (query.unread !== undefined) params = params.set('unread', String(query.unread));
    return this.http.get<PaginatedResponse<AppNotification>>(this.api, { params });
  }

  unreadCount(): Observable<ApiResponse<{ count: number }>> {
    return this.http.get<ApiResponse<{ count: number }>>(`${this.api}/unread-count`);
  }

  markRead(ids?: string[]): Observable<ApiResponse<{ unread: number }>> {
    return this.http.patch<ApiResponse<{ unread: number }>>(`${this.api}/read`, ids?.length ? { ids } : {});
  }

  remove(id: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.api}/${id}`);
  }

  runScan(): Observable<ApiResponse<{ dueSoon: number; overdue: number }>> {
    return this.http.post<ApiResponse<{ dueSoon: number; overdue: number }>>(`${this.api}/scan`, {});
  }
}
