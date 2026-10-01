import { z } from 'zod';
import { PRIORITY_LIST, PROJECT_STATUS_LIST, ROLE_NAMES, TASK_STATUS_LIST } from '../utils/constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');

// --- Auth -------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.enum(ROLE_NAMES).optional(),
  phone: z.string().max(30).optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6).max(128),
});

// --- Users ------------------------------------------------------------------
export const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.enum(ROLE_NAMES).default('MEMBER'),
  phone: z.string().max(30).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).max(128).optional(),
  role: z.enum(ROLE_NAMES).optional(),
  phone: z.string().max(30).optional().nullable(),
  isActive: z.boolean().optional(),
});

// --- Projects ---------------------------------------------------------------
export const createProjectSchema = z.object({
  name: z.string().min(2).max(160),
  code: z.string().min(2).max(30).optional(),
  description: z.string().max(2000).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  priority: z.enum(PRIORITY_LIST).default('MEDIUM'),
  status: z.enum(PROJECT_STATUS_LIST).default('PLANNING'),
});

export const updateProjectSchema = createProjectSchema.partial();

// --- Teams ------------------------------------------------------------------
export const createTeamSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional().nullable(),
  projectId: objectId.optional().nullable(),
  leadId: objectId.optional().nullable(),
  memberIds: z.array(objectId).optional().default([]),
});

export const updateTeamSchema = createTeamSchema.partial();

export const teamMemberSchema = z.object({
  userId: objectId,
});

// --- Tasks ------------------------------------------------------------------
export const createTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(4000).optional().nullable(),
  priority: z.enum(PRIORITY_LIST).default('MEDIUM'),
  status: z.enum(TASK_STATUS_LIST).default('TODO'),
  progress: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().optional().nullable(),
  projectId: objectId,
  assigneeIds: z.array(objectId).optional().default([]),
});

export const updateTaskSchema = createTaskSchema.partial().omit({ assigneeIds: true });

export const assignTaskSchema = z.object({
  userIds: z.array(objectId).min(1, 'At least one user is required'),
});

export const taskProgressSchema = z.object({
  status: z.enum(TASK_STATUS_LIST).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  comment: z.string().max(2000).optional().nullable(),
});

export const extendDeadlineSchema = z.object({
  dueDate: z.string().min(1, 'New due date is required'),
  comment: z.string().max(2000).optional().nullable(),
});

// --- Notifications ----------------------------------------------------------
export const notificationReadSchema = z.object({
  ids: z.array(objectId).optional(),
});
