// Module 4: Team Management - create teams, manage members, link to projects.
import { Router } from 'express';
import { prisma } from '../database/prisma.js';
import { authenticate, authorize } from '../auth/middleware.js';
import { asyncHandler, sendPaginated, sendSuccess, ApiError, parsePagination } from '../utils/http.js';
import { validateBody } from '../schemas/validate.js';
import { createTeamSchema, teamMemberSchema, updateTeamSchema } from '../schemas/index.js';
import { ROLES } from '../utils/constants.js';
import { TEAM_SELECT } from '../models/team.model.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { search, projectId } = req.query;

    const where = {
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(projectId ? { projectId } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.team.findMany({ where, select: TEAM_SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.team.count({ where }),
    ]);

    return sendPaginated(res, items, { page, limit, total });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const team = await prisma.team.findUnique({ where: { id: req.params.id }, select: TEAM_SELECT });
    if (!team) throw ApiError.notFound('Team not found');
    return sendSuccess(res, { team });
  }),
);

router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validateBody(createTeamSchema),
  asyncHandler(async (req, res) => {
    const { name, description, projectId, leadId, memberIds } = req.body;

    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw ApiError.badRequest('Linked project does not exist');
    }
    if (leadId) {
      const lead = await prisma.user.findUnique({ where: { id: leadId } });
      if (!lead) throw ApiError.badRequest('Team lead does not exist');
    }

    const team = await prisma.team.create({
      data: {
        name,
        description: description ?? null,
        projectId: projectId ?? null,
        leadId: leadId ?? null,
        members: memberIds?.length
          ? { createMany: { data: memberIds.map((userId) => ({ userId })), skipDuplicates: true } }
          : undefined,
      },
      select: TEAM_SELECT,
    });

    return sendSuccess(res, { team }, 201);
  }),
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validateBody(updateTeamSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.team.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Team not found');

    const { name, description, projectId, leadId } = req.body;

    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(projectId !== undefined ? { projectId: projectId || null } : {}),
        ...(leadId !== undefined ? { leadId: leadId || null } : {}),
      },
      select: TEAM_SELECT,
    });

    return sendSuccess(res, { team });
  }),
);

router.post(
  '/:id/members',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validateBody(teamMemberSchema),
  asyncHandler(async (req, res) => {
    const team = await prisma.team.findUnique({ where: { id: req.params.id } });
    if (!team) throw ApiError.notFound('Team not found');

    const user = await prisma.user.findUnique({ where: { id: req.body.userId } });
    if (!user) throw ApiError.badRequest('User does not exist');

    const existing = await prisma.teamMember.findFirst({ where: { teamId: team.id, userId: user.id } });
    if (existing) throw ApiError.conflict('This user is already a member of the team');

    await prisma.teamMember.create({ data: { teamId: team.id, userId: user.id } });

    const updated = await prisma.team.findUnique({ where: { id: team.id }, select: TEAM_SELECT });
    return sendSuccess(res, { team: updated }, 201);
  }),
);

router.delete(
  '/:id/members/:userId',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  asyncHandler(async (req, res) => {
    const team = await prisma.team.findUnique({ where: { id: req.params.id } });
    if (!team) throw ApiError.notFound('Team not found');

    await prisma.teamMember.deleteMany({ where: { teamId: team.id, userId: req.params.userId } });

    const updated = await prisma.team.findUnique({ where: { id: team.id }, select: TEAM_SELECT });
    return sendSuccess(res, { team: updated });
  }),
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  asyncHandler(async (req, res) => {
    const team = await prisma.team.findUnique({ where: { id: req.params.id } });
    if (!team) throw ApiError.notFound('Team not found');

    await prisma.$transaction([
      prisma.teamMember.deleteMany({ where: { teamId: team.id } }),
      prisma.team.delete({ where: { id: team.id } }),
    ]);

    return sendSuccess(res, { message: 'Team deleted' });
  }),
);

export default router;
