// Shared domain constants and enums for the Project Management System.

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
});

export const ROLE_NAMES = Object.values(ROLES);

export const ROLE_DESCRIPTIONS = Object.freeze({
  ADMIN: 'Manages users, creates projects and teams, views all reports.',
  MANAGER: 'Creates tasks, assigns them to members, tracks progress and deadlines.',
  MEMBER: 'Views assigned tasks, updates task status, receives deadline notifications.',
});

export const PROJECT_STATUS = Object.freeze({
  PLANNING: 'PLANNING',
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

export const PROJECT_STATUS_LIST = Object.values(PROJECT_STATUS);

export const TASK_STATUS = Object.freeze({
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
});

export const TASK_STATUS_LIST = Object.values(TASK_STATUS);

export const PRIORITY = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

export const PRIORITY_LIST = Object.values(PRIORITY);

export const NOTIFICATION_TYPE = Object.freeze({
  ASSIGNMENT: 'ASSIGNMENT',
  DEADLINE_SOON: 'DEADLINE_SOON',
  OVERDUE: 'OVERDUE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  SYSTEM: 'SYSTEM',
});

// Number of days ahead of a due date that triggers a "deadline soon" alert.
export const DEADLINE_SOON_DAYS = 2;

// Statuses that are considered finished (excluded from overdue checks).
export const CLOSED_TASK_STATUSES = [TASK_STATUS.DONE];
