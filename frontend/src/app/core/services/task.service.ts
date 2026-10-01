import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from './api.types';
import { BoardColumns, Task, TaskPayload, TaskStatus } from '../models/task.model';

export interface TaskQuery {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  overdue?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/tasks`;

  list(query: TaskQuery = {}): Observable<PaginatedResponse<Task>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    });
    return this.http.get<PaginatedResponse<Task>>(this.api, { params });
  }

  board(projectId?: string): Observable<ApiResponse<{ columns: BoardColumns; total: number }>> {
    let params = new HttpParams();
    if (projectId) params = params.set('projectId', projectId);
    return this.http.get<ApiResponse<{ columns: BoardColumns; total: number }>>(`${this.api}/board`, { params });
  }

  get(id: string): Observable<ApiResponse<{ task: Task }>> {
    return this.http.get<ApiResponse<{ task: Task }>>(`${this.api}/${id}`);
  }

  create(payload: TaskPayload): Observable<ApiResponse<{ task: Task }>> {
    return this.http.post<ApiResponse<{ task: Task }>>(this.api, payload);
  }

  update(id: string, payload: Partial<TaskPayload>): Observable<ApiResponse<{ task: Task }>> {
    return this.http.put<ApiResponse<{ task: Task }>>(`${this.api}/${id}`, payload);
  }

  assign(id: string, userIds: string[]): Observable<ApiResponse<{ task: Task }>> {
    return this.http.put<ApiResponse<{ task: Task }>>(`${this.api}/${id}/assign`, { userIds });
  }

  addAssignee(id: string, userId: string): Observable<ApiResponse<{ task: Task }>> {
    return this.http.post<ApiResponse<{ task: Task }>>(`${this.api}/${id}/assignees`, { userId });
  }

  removeAssignee(id: string, userId: string): Observable<ApiResponse<{ task: Task }>> {
    return this.http.delete<ApiResponse<{ task: Task }>>(`${this.api}/${id}/assignees/${userId}`);
  }

  updateProgress(
    id: string,
    payload: { status?: TaskStatus; progress?: number; comment?: string | null },
  ): Observable<ApiResponse<{ task: Task }>> {
    return this.http.post<ApiResponse<{ task: Task }>>(`${this.api}/${id}/progress`, payload);
  }

  extendDeadline(id: string, dueDate: string, comment?: string): Observable<ApiResponse<{ task: Task }>> {
    return this.http.patch<ApiResponse<{ task: Task }>>(`${this.api}/${id}/deadline`, { dueDate, comment });
  }

  remove(id: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.api}/${id}`);
  }
}
