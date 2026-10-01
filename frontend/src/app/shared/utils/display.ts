import { Priority, ProjectStatus } from '../../core/models/project.model';
import { TaskStatus } from '../../core/models/task.model';

export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const PROJECT_STATUSES: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

const LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  ADMIN: 'Admin',
  MANAGER: 'Project Manager',
  MEMBER: 'Team Member',
  ASSIGNMENT: 'Assignment',
  DEADLINE_SOON: 'Deadline Soon',
  OVERDUE: 'Overdue',
  STATUS_CHANGE: 'Status Change',
  SYSTEM: 'System',
};

export function label(value?: string | null): string {
  if (!value) return '-';
  return LABELS[value] ?? value;
}

export function priorityClass(priority: Priority | string): string {
  return `chip chip-${String(priority).toLowerCase()}`;
}

export function statusClass(status: string): string {
  return `chip chip-status-${status.toLowerCase().replace('_', '-')}`;
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toDateInput(value?: string | Date | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function relativeTime(value?: string | Date | null): string {
  if (!value) return '-';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(value);
}

export function isOverdue(dueDate?: string | null, status?: TaskStatus): boolean {
  if (!dueDate || status === 'DONE') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate).getTime() < today.getTime();
}

export function dueSoon(dueDate?: string | null, status?: TaskStatus, withinDays = 2): boolean {
  if (!dueDate || status === 'DONE') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  return diff >= 0 && diff <= withinDays;
}

export function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
