import { Priority } from './project.model';
import { Task, TaskStatus } from './task.model';

export interface DashboardStats {
  projects: { total: number; active: number; completed: number };
  tasks: { total: number; todo: number; inProgress: number; done: number; overdue: number };
  upcomingTasks: DashboardTaskRef[];
  overdueTasks: DashboardTaskRef[];
  recentActivity: {
    id: string;
    status: TaskStatus;
    progress: number;
    comment?: string | null;
    createdAt: string;
    user: { id: string; name: string };
    task: { id: string; title: string };
  }[];
  progressTrend: { date: string; count: number }[];
}

export interface DashboardTaskRef {
  id: string;
  title: string;
  dueDate?: string | null;
  priority: Priority;
  status: TaskStatus;
  project: { name: string };
}

export interface ReportSummary {
  project: {
    id: string;
    name: string;
    code: string;
    status: string;
    priority: Priority;
    startDate?: string | null;
    endDate?: string | null;
  };
  metrics: {
    total: number;
    byStatus: Record<TaskStatus, number>;
    overdue: number;
    avgProgress: number;
    completion: number;
  };
  byPriority: Record<string, number>;
}

export interface WorkloadRow {
  user: { id: string; name: string; email: string; role: { name: string } };
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
  avgProgress: number;
}

export interface ReportOverview {
  summary: ReportSummary | null;
  taskStatus: { byStatus: Record<TaskStatus, number>; total: number; tasks: Task[] };
  workload: WorkloadRow[];
}

export interface DeadlineOverview {
  upcoming: DashboardTaskRef[];
  overdue: DashboardTaskRef[];
}
