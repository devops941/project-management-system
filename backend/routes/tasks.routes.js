// Modules 5-8: Task Creation, Task Assignment, Progress Tracking, Deadline
// Management - all task-centric endpoints.
import { Router } from 'express';
import { prisma } from '../database/prisma.js';
import { authenticate, authorize } from '../auth/middleware.js';
import { asyncHandler, sendPaginated, sendSuccess, ApiError, parsePagination } from '../utils/http.js';
import { validateBody } from '../schemas/validate.js';
import {
  assignTaskSchema,
  createTaskSchema,
  extendDeadlineSchema,
  taskProgressSchema,
  updateTaskSchema,
} from '../schemas/index.js';
import { NOTIFICATION_TYPE, ROLES, TASK_STATUS } from '../utils/constants.js';
import { TASK_DETAIL, TASK_SELECT } from '../models/task.model.js';
import { toDateOrNull } from '../utils/dates.js';
import { notifyMany } from '../services/notification.service.js';

const router = Router();
router.use(authenticate);

function isPrivileged(user) {
  return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
}

// Members may only see tasks they are assigned to.
function visibilityFilter(user) {
  return isPrivileged(user) ? {} : { assignments: { some: { userId: user.sub } } };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query, 50);
    const { search, projectId, status, priority, assigneeId, overdue } = req.query;

    const where = {
      ...visibilityFilter(req.user),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(assigneeId ? { assignments: { some: { userId: assigneeId } } } : {}),
      ...(overdue === 'true' ? { dueDate: { lt: new Date(new Date().setHours(0, 0, 0, 0)) }, status: { not: TASK_STATUS.DONE } } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.task.findMany({ where, select: TASK_SELECT, orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }], skip, take: limit }),
      prisma.task.count({ where }),
    ]);

    return sendPaginated(res, items, { page, limit, total });
  }),
);

// Kanban board view: tasks grouped into To Do / In Progress / Done columns.
router.get(
  '/board',
  asyncHandler(async (req, res) => {
    const { projectId } = req.query;
    const where = { ...visibilityFilter(req.user), ...(projectId ? { projectId } : {}) };

    const tasks = await prisma.task.findMany({
      where,
      select: TASK_SELECT,
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });

    const columns = { TODO: [], IN_PROGRESS: [], DONE: [] };
    for (const task of tasks) (columns[task.status] ||= []).push(task);

    return sendSuccess(res, { columns, total: tasks.length });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: TASK_DETAIL });
    if (!task) throw ApiError.notFound('Task not found');

    if (!isPrivileged(req.user) && !task.assignments.some((a) => a.user.id === req.user.sub)) {
      throw ApiError.forbidden('You are not assigned to this task');
    }
    return sendSuccess(res, { task });
  }),
);

// Module 5: Task Creation
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validateBody(createTaskSchema),
  asyncHandler(async (req, res) => {
    const { title, description, priority, status, progress, dueDate, projectId, assigneeIds } = req.body;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw ApiError.badRequest('Project does not exist');

    const normalizedStatus = status || TASK_STATUS.TODO;
    const task = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        priority,
        status: normalizedStatus,
        progress: normalizedStatus === TASK_STATUS.DONE ? 100 : progress ?? 0,
        dueDate: toDateOrNull(dueDate),
        completedAt: normalizedStatus === TASK_STATUS.DONE ? new Date() : null,
        projectId,
        assignments: assigneeIds?.length
          ? { createMany: { data: assigneeIds.map((userId) => ({ userId })), skipDuplicates: true } }
          : undefined,
      },
      select: TASK_SELECT,
    });

    // Module 9: notify assignees about the new assignment.
    if (assigneeIds?.length) {
      await notifyMany(assigneeIds, {
        type: NOTIFICATION_TYPE.ASSIGNMENT,
        title: 'New task assigned',
        message: `You have been assigned "${task.title}" in project ${project.name}.`,
        link: `/tasks/${task.id}`,
        email: true,
      });
    }

    return sendSuccess(res, { task }, 201);
  }),
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validateBody(updateTaskSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Task not found');

    const { title, description, priority, status, progress, dueDate, projectId } = req.body;

    const nextStatus = status ?? existing.status;
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(progress !== undefined ? { progress } : {}),
        ...(dueDate !== undefined ? { dueDate: toDateOrNull(dueDate) } : {}),
        ...(projectId !== undefined ? { projectId } : {}),
        ...(nextStatus === TASK_STATUS.DONE
          ? { progress: 100, completedAt: existing.completedAt ?? new Date() }
          : { completedAt: null }),
      },
      select: TASK_SELECT,
    });

    return sendSuccess(res, { task });
  }),
);

// Module 6: Task Assignment - replace the assignee set and notify the newcomers.
router.put(
  '/:id/assign',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validateBody(assignTaskSchema),
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      select: { id: true, title: true, assignments: { select: { userId: true } }, project: { select: { name: true } } },
    });
    if (!task) throw ApiError.notFound('Task not found');

    const previous = new Set(task.assignments.map((a) => a.userId));
    const next = [...new Set(req.body.userIds)];

    await prisma.$transaction([
      prisma.taskAssignment.deleteMany({ where: { taskId: task.id } }),
      prisma.taskAssignment.createMany({ data: next.map((userId) => ({ taskId: task.id, userId })), skipDuplicates: true }),
    ]);

    const added = next.filter((id) => !previous.has(id));
    if (added.length) {
      await notifyMany(added, {
        type: NOTIFICATION_TYPE.ASSIGNMENT,
        title: 'New task assigned',
        message: `You have been assigned "${task.title}" in project ${task.project.name}.`,
        link: `/tasks/${task.id}`,
        email: true,
      });
    }

    const updated = await prisma.task.findUnique({ where: { id: task.id }, select: TASK_SELECT });
    return sendSuccess(res, { task: updated });
  }),
);

router.post(
  '/:id/assignees',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  asyncHandler(async (req, res) => {
    const { userId } = req.body;
    if (!userId) throw ApiError.badRequest('userId is required');

    const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: { id: true, title: true, project: { select: { name: true } } } });
    if (!task) throw ApiError.notFound('Task not found');

    await prisma.taskAssignment.createMany({ data: [{ taskId: task.id, userId }], skipDuplicates: true });
    await notifyMany([userId], {
      type: NOTIFICATION_TYPE.ASSIGNMENT,
      title: 'New task assigned',
      message: `You have been assigned "${task.title}" in project ${task.project.name}.`,
      link: `/tasks/${task.id}`,
      email: true,
    });

    const updated = await prisma.task.findUnique({ where: { id: task.id }, select: TASK_SELECT });
    return sendSuccess(res, { task: updated }, 201);
  }),
);

router.delete(
  '/:id/assignees/:userId',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw ApiError.notFound('Task not found');

    await prisma.taskAssignment.deleteMany({ where: { taskId: task.id, userId: req.params.userId } });
    const updated = await prisma.task.findUnique({ where: { id: task.id }, select: TASK_SELECT });
    return sendSuccess(res, { task: updated });
  }),
);

// Module 7: Progress Tracking - assignees and managers post status updates.
router.post(
  '/:id/progress',
  validateBody(taskProgressSchema),
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        title: true,
        status: true,
        progress: true,
        dueDate: true,
        assignments: { select: { userId: true } },
      },
    });
    if (!task) throw ApiError.notFound('Task not found');

    const assigned = task.assignments.some((a) => a.userId === req.user.sub);
    if (!isPrivileged(req.user) && !assigned) {
      throw ApiError.forbidden('Only assignees or managers can update this task');
    }

    const { status, progress, comment } = req.body;
    const nextStatus = status ?? task.status;
    const nextProgress =
      progress ?? (nextStatus === TASK_STATUS.DONE ? 100 : task.progress);

    const completedAt = nextStatus === TASK_STATUS.DONE ? new Date() : null;

    const [, updated] = await prisma.$transaction([
      prisma.taskUpdate.create({
        data: {
          taskId: task.id,
          userId: req.user.sub,
          status: nextStatus,
          progress: nextProgress,
          comment: comment ?? null,
        },
      }),
      prisma.task.update({
        where: { id: task.id },
        data: { status: nextStatus, progress: nextProgress, completedAt },
        select: TASK_SELECT,
      }),
    ]);

    // Notify the other assignees when the status changes.
    if (status && status !== task.status) {
      const others = task.assignments.map((a) => a.userId).filter((id) => id !== req.user.sub);
      if (others.length) {
        await notifyMany(others, {
          type: NOTIFICATION_TYPE.STATUS_CHANGE,
          title: 'Task status updated',
          message: `"${task.title}" moved to ${nextStatus.replace('_', ' ')}.`,
          link: `/tasks/${task.id}`,
        });
      }
    }

    return sendSuccess(res, { task: updated });
  }),
);

// Module 8: Deadline Management - extend a task's due date.
router.patch(
  '/:id/deadline',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validateBody(extendDeadlineSchema),
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw ApiError.notFound('Task not found');

    const newDueDate = toDateOrNull(req.body.dueDate);
    if (!newDueDate) throw ApiError.badRequest('A valid new due date is required');

    const [, updated] = await prisma.$transaction([
      prisma.taskUpdate.create({
        data: {
          taskId: task.id,
          userId: req.user.sub,
          status: task.status,
          progress: task.progress,
          comment: req.body.comment ?? 'Deadline extended',
          previousDueDate: task.dueDate,
          newDueDate,
        },
      }),
      prisma.task.update({ where: { id: task.id }, data: { dueDate: newDueDate }, select: TASK_SELECT }),
    ]);

    const assigneeIds = (await prisma.taskAssignment.findMany({ where: { taskId: task.id }, select: { userId: true } })).map((a) => a.userId);
    if (assigneeIds.length) {
      await notifyMany(assigneeIds, {
        type: NOTIFICATION_TYPE.SYSTEM,
        title: 'Deadline extended',
        message: `The deadline for "${task.title}" was moved to ${newDueDate.toDateString()}.`,
        link: `/tasks/${task.id}`,
        email: true,
      });
    }

    return sendSuccess(res, { task: updated });
  }),
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw ApiError.notFound('Task not found');

    await prisma.$transaction([
      prisma.taskAssignment.deleteMany({ where: { taskId: task.id } }),
      prisma.taskUpdate.deleteMany({ where: { taskId: task.id } }),
      prisma.task.delete({ where: { id: task.id } }),
    ]);

    return sendSuccess(res, { message: 'Task deleted' });
  }),
);

export default router;
