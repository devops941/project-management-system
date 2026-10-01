// Project model helpers.
import { prisma } from '../database/prisma.js';

export const PROJECT_SELECT = {
  id: true,
  name: true,
  code: true,
  description: true,
  startDate: true,
  endDate: true,
  priority: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { tasks: true, teams: true } },
};

export const PROJECT_DETAIL = {
  ...PROJECT_SELECT,
  teams: {
    select: {
      id: true,
      name: true,
      lead: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true } },
    },
  },
};

export function findById(id) {
  return prisma.project.findUnique({ where: { id }, select: PROJECT_DETAIL });
}

export function listProjects({ where = {}, skip = 0, take = 20, orderBy = { createdAt: 'desc' } } = {}) {
  return prisma.$transaction([
    prisma.project.findMany({ where, select: PROJECT_SELECT, orderBy, skip, take }),
    prisma.project.count({ where }),
  ]);
}
