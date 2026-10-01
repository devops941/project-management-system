import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from './api.types';
import { DashboardStats, DeadlineOverview, ReportOverview } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}`;

  stats(): Observable<ApiResponse<DashboardStats>> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.api}/dashboard`);
  }

  deadlines(): Observable<ApiResponse<DeadlineOverview>> {
    return this.http.get<ApiResponse<DeadlineOverview>>(`${this.api}/notifications/deadlines`);
  }

  reportsOverview(projectId?: string): Observable<ApiResponse<ReportOverview>> {
    let params = new HttpParams();
    if (projectId) params = params.set('projectId', projectId);
    return this.http.get<ApiResponse<ReportOverview>>(`${this.api}/reports/overview`, { params });
  }

  exportReport(type: 'summary' | 'tasks' | 'workload', format: 'pdf' | 'excel', projectId?: string): Observable<Blob> {
    let params = new HttpParams().set('type', type).set('format', format);
    if (projectId) params = params.set('projectId', projectId);
    return this.http.get(`${this.api}/reports/export`, { params, responseType: 'blob' });
  }
}
