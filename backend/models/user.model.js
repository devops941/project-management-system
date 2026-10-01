// User model helpers: shared Prisma select shapes and small query utilities.
import { prisma } from '../database/prisma.js';

export const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { id: true, name: true } },
};

export const USER_WITH_COUNTS = {
  ...USER_SELECT,
  _count: { select: { assignments: true, teamMembers: true } },
};

export function findByEmail(email) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { role: true },
  });
}

export function findById(id) {
  return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
}

export function listUsers({ where = {}, skip = 0, take = 20 } = {}) {
  return prisma.$transaction([
    prisma.user.findMany({
      where,
      select: USER_WITH_COUNTS,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);
}

export function countUsers(where = {}) {
  return prisma.user.count({ where });
}
