import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from './api.types';
import { Project, ProjectPayload } from '../models/project.model';

export interface ProjectQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/projects`;

  list(query: ProjectQuery = {}): Observable<PaginatedResponse<Project>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    });
    return this.http.get<PaginatedResponse<Project>>(this.api, { params });
  }

  get(id: string): Observable<{ success: boolean; data: { project: Project } }> {
    return this.http.get<{ success: boolean; data: { project: Project } }>(`${this.api}/${id}`);
  }

  create(payload: ProjectPayload): Observable<{ success: boolean; data: { project: Project } }> {
    return this.http.post<{ success: boolean; data: { project: Project } }>(this.api, payload);
  }

  update(id: string, payload: Partial<ProjectPayload>): Observable<{ success: boolean; data: { project: Project } }> {
    return this.http.put<{ success: boolean; data: { project: Project } }>(`${this.api}/${id}`, payload);
  }

  close(id: string): Observable<{ success: boolean; data: { project: Project } }> {
    return this.http.patch<{ success: boolean; data: { project: Project } }>(`${this.api}/${id}/close`, {});
  }

  remove(id: string): Observable<{ success: boolean; data: { message: string } }> {
    return this.http.delete<{ success: boolean; data: { message: string } }>(`${this.api}/${id}`);
  }
}
