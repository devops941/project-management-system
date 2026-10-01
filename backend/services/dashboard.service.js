// Dashboard service: aggregate counters and recent activity for the home screen.
import { prisma } from '../database/prisma.js';
import { TASK_STATUS } from '../utils/constants.js';
import { addDays, startOfDay, isOverdue } from '../utils/dates.js';

export async function dashboardStats({ userId, isPrivileged }) {
  const now = new Date();
  const taskScope = isPrivileged ? {} : { assignments: { some: { userId } } };

  const [
    totalProjects,
    activeProjects,
    completedProjects,
    totalTasks,
    todo,
    inProgress,
    done,
    upcomingTasks,
  ] = await prisma.$transaction([
    prisma.project.count(),
    prisma.project.count({ where: { status: 'ACTIVE' } }),
    prisma.project.count({ where: { status: 'COMPLETED' } }),
    prisma.task.count({ where: taskScope }),
    prisma.task.count({ where: { ...taskScope, status: TASK_STATUS.TODO } }),
    prisma.task.count({ where: { ...taskScope, status: TASK_STATUS.IN_PROGRESS } }),
    prisma.task.count({ where: { ...taskScope, status: TASK_STATUS.DONE } }),
    prisma.task.findMany({
      where: { ...taskScope, status: { not: TASK_STATUS.DONE }, dueDate: { gte: startOfDay(now), lte: addDays(startOfDay(now), 7) } },
      select: { id: true, title: true, dueDate: true, priority: true, status: true, project: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),
  ]);

  const overdueTasks = await prisma.task.findMany({
    where: { ...taskScope, status: { not: TASK_STATUS.DONE }, dueDate: { lt: startOfDay(now) } },
    select: { id: true, title: true, dueDate: true, priority: true, status: true, project: { select: { name: true } } },
    orderBy: { dueDate: 'asc' },
    take: 5,
  });

  const recentActivity = await prisma.taskUpdate.findMany({
    where: isPrivileged ? {} : { userId },
    select: {
      id: true,
      status: true,
      progress: true,
      comment: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  // Progress trend: tasks completed per day over the last 14 days.
  const since = addDays(startOfDay(now), -13);
  const completedTasks = await prisma.task.findMany({
    where: { ...taskScope, status: TASK_STATUS.DONE, completedAt: { gte: since } },
    select: { completedAt: true },
  });

  const trendMap = new Map();
  for (let i = 0; i < 14; i += 1) {
    const d = addDays(since, i);
    trendMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const t of completedTasks) {
    const key = new Date(t.completedAt).toISOString().slice(0, 10);
    if (trendMap.has(key)) trendMap.set(key, trendMap.get(key) + 1);
  }
  const progressTrend = [...trendMap.entries()].map(([date, count]) => ({ date, count }));

  return {
    projects: { total: totalProjects, active: activeProjects, completed: completedProjects },
    tasks: { total: totalTasks, todo, inProgress, done, overdue: overdueTasks.length },
    upcomingTasks,
    overdueTasks,
    recentActivity,
    progressTrend,
  };
}

export const dashboardService = { dashboardStats };
