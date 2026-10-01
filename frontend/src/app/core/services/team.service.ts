import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from './api.types';
import { Team, TeamPayload } from '../models/team.model';

export interface TeamQuery {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/teams`;

  list(query: TeamQuery = {}): Observable<PaginatedResponse<Team>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    });
    return this.http.get<PaginatedResponse<Team>>(this.api, { params });
  }

  get(id: string): Observable<{ success: boolean; data: { team: Team } }> {
    return this.http.get<{ success: boolean; data: { team: Team } }>(`${this.api}/${id}`);
  }

  create(payload: TeamPayload): Observable<{ success: boolean; data: { team: Team } }> {
    return this.http.post<{ success: boolean; data: { team: Team } }>(this.api, payload);
  }

  update(id: string, payload: Partial<TeamPayload>): Observable<{ success: boolean; data: { team: Team } }> {
    return this.http.put<{ success: boolean; data: { team: Team } }>(`${this.api}/${id}`, payload);
  }

  addMember(id: string, userId: string): Observable<{ success: boolean; data: { team: Team } }> {
    return this.http.post<{ success: boolean; data: { team: Team } }>(`${this.api}/${id}/members`, { userId });
  }

  removeMember(id: string, userId: string): Observable<{ success: boolean; data: { team: Team } }> {
    return this.http.delete<{ success: boolean; data: { team: Team } }>(`${this.api}/${id}/members/${userId}`);
  }

  remove(id: string): Observable<{ success: boolean; data: { message: string } }> {
    return this.http.delete<{ success: boolean; data: { message: string } }>(`${this.api}/${id}`);
  }
}
