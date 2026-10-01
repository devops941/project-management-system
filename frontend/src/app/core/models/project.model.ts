export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  priority: Priority;
  status: ProjectStatus;
  createdAt?: string;
  updatedAt?: string;
  _count?: { tasks: number; teams: number };
  teams?: TeamSummary[];
}

export interface TeamSummary {
  id: string;
  name: string;
  lead?: { id: string; name: string; email: string } | null;
  _count?: { members: number };
}

export interface ProjectPayload {
  name: string;
  code?: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  priority: Priority;
  status: ProjectStatus;
}
