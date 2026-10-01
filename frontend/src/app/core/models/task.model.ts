import { Priority } from './project.model';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface TaskAssignee {
  id: string;
  assignedAt: string;
  user: { id: string; name: string; email: string };
}

export interface TaskUpdateEntry {
  id: string;
  status: TaskStatus;
  progress: number;
  comment?: string | null;
  previousDueDate?: string | null;
  newDueDate?: string | null;
  createdAt: string;
  user: { id: string; name: string };
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: Priority;
  status: TaskStatus;
  progress: number;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  project: { id: string; name: string; code: string };
  assignments: TaskAssignee[];
  updates?: TaskUpdateEntry[];
  _count?: { updates: number };
}

export interface TaskPayload {
  title: string;
  description?: string | null;
  priority: Priority;
  status: TaskStatus;
  progress?: number;
  dueDate?: string | null;
  projectId: string;
  assigneeIds?: string[];
}

export interface BoardColumns {
  TODO: Task[];
  IN_PROGRESS: Task[];
  DONE: Task[];
}
