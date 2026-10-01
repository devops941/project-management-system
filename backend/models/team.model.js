// Team and team member model helpers.
import { prisma } from '../database/prisma.js';

export const TEAM_SELECT = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, name: true, code: true, status: true } },
  lead: { select: { id: true, name: true, email: true } },
  members: {
    select: {
      id: true,
      joinedAt: true,
      user: { select: { id: true, name: true, email: true, role: { select: { name: true } } } },
    },
  },
};

export function findById(id) {
  return prisma.team.findUnique({ where: { id }, select: TEAM_SELECT });
}

export function listTeams({ where = {}, skip = 0, take = 20 } = {}) {
  return prisma.$transaction([
    prisma.team.findMany({ where, select: TEAM_SELECT, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.team.count({ where }),
  ]);
}

export function memberCount(teamId) {
  return prisma.teamMember.count({ where: { teamId } });
}
