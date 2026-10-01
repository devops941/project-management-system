// Task, task assignment and task update model helpers.
import { prisma } from '../database/prisma.js';

export const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  progress: true,
  dueDate: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, name: true, code: true } },
  assignments: {
    select: { id: true, assignedAt: true, user: { select: { id: true, name: true, email: true } } },
  },
  _count: { select: { updates: true } },
};

export const TASK_DETAIL = {
  ...TASK_SELECT,
  updates: {
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      progress: true,
      comment: true,
      previousDueDate: true,
      newDueDate: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    },
  },
};

export function findById(id) {
  return prisma.task.findUnique({ where: { id }, select: TASK_DETAIL });
}

export function listTasks({ where = {}, skip = 0, take = 20, orderBy = { createdAt: 'desc' } } = {}) {
  return prisma.$transaction([
    prisma.task.findMany({ where, select: TASK_SELECT, orderBy, skip, take }),
    prisma.task.count({ where }),
  ]);
}

export function addAssignments(taskId, userIds) {
  return prisma.taskAssignment.createMany({
    data: userIds.map((userId) => ({ taskId, userId })),
    skipDuplicates: true,
  });
}

export function removeAssignment(taskId, userId) {
  return prisma.taskAssignment.deleteMany({ where: { taskId, userId } });
}
