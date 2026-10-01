// Deadline service: scans tasks and raises "due soon" and "overdue" alerts.
// Also exposes helpers used by the Deadline Management module screens.
import { prisma } from '../database/prisma.js';
import { notifyUser } from './notification.service.js';
import { NOTIFICATION_TYPE, DEADLINE_SOON_DAYS, TASK_STATUS } from '../utils/constants.js';
import { addDays, daysBetween, startOfDay, isOverdue, isDueSoon } from '../utils/dates.js';

// Creates DEADLINE_SOON notifications for tasks due within DEADLINE_SOON_DAYS,
// avoiding duplicate alerts for the same task/user/day.
export async function scanDueSoon() {
  const now = new Date();
  const horizon = addDays(startOfDay(now), DEADLINE_SOON_DAYS);

  const tasks = await prisma.task.findMany({
    where: {
      status: { not: TASK_STATUS.DONE },
      dueDate: { gte: startOfDay(now), lte: horizon },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      assignments: { select: { userId: true } },
    },
  });

  let created = 0;
  for (const task of tasks) {
    const days = daysBetween(now, task.dueDate);
    const title = 'Task due soon';
    const message = `"${task.title}" is due in ${days} day(s).`;
    const link = `/tasks/${task.id}`;
    for (const { userId } of task.assignments) {
      const alreadySent = await prisma.notification.findFirst({
        where: {
          userId,
          type: NOTIFICATION_TYPE.DEADLINE_SOON,
          link,
          createdAt: { gte: startOfDay(now) },
        },
        select: { id: true },
      });
      if (alreadySent) continue;
      await notifyUser({ userId, type: NOTIFICATION_TYPE.DEADLINE_SOON, title, message, link, email: true });
      created += 1;
    }
  }
  return created;
}

// Creates OVERDUE notifications for tasks past their due date and still open.
export async function scanOverdue() {
  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: { status: { not: TASK_STATUS.DONE }, dueDate: { lt: startOfDay(now) } },
    select: {
      id: true,
      title: true,
      dueDate: true,
      assignments: { select: { userId: true } },
    },
  });

  let created = 0;
  for (const task of tasks) {
    const link = `/tasks/${task.id}`;
    for (const { userId } of task.assignments) {
      const alreadySent = await prisma.notification.findFirst({
        where: { userId, type: NOTIFICATION_TYPE.OVERDUE, link, createdAt: { gte: startOfDay(now) } },
        select: { id: true },
      });
      if (alreadySent) continue;
      await notifyUser({
        userId,
        type: NOTIFICATION_TYPE.OVERDUE,
        title: 'Task overdue',
        message: `"${task.title}" is past its due date.`,
        link,
        email: true,
      });
      created += 1;
    }
  }
  return created;
}

export async function runDeadlineScan() {
  const [dueSoon, overdue] = await Promise.all([scanDueSoon(), scanOverdue()]);
  return { dueSoon, overdue };
}

// Returns upcoming / overdue task lists for the Deadline Management screen.
export async function deadlineOverview({ userId, isPrivileged }) {
  const now = new Date();
  const baseWhere = {
    status: { not: TASK_STATUS.DONE },
    ...(isPrivileged ? {} : { assignments: { some: { userId } } }),
  };

  const [upcoming, overdue] = await prisma.$transaction([
    prisma.task.findMany({
      where: { ...baseWhere, dueDate: { gte: startOfDay(now), lte: addDays(startOfDay(now), 7) } },
      select: { id: true, title: true, dueDate: true, priority: true, status: true, project: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 50,
    }),
    prisma.task.findMany({
      where: { ...baseWhere, dueDate: { lt: startOfDay(now) } },
      select: { id: true, title: true, dueDate: true, priority: true, status: true, project: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 50,
    }),
  ]);

  return { upcoming, overdue };
}

export const deadlineService = {
  runDeadlineScan,
  scanDueSoon,
  scanOverdue,
  deadlineOverview,
  isOverdue,
  isDueSoon,
};
