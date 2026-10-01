// Module 3: Project Creation - CRUD for projects.
import { Router } from 'express';
import { prisma } from '../database/prisma.js';
import { authenticate, authorize } from '../auth/middleware.js';
import { asyncHandler, sendPaginated, sendSuccess, ApiError, parsePagination } from '../utils/http.js';
import { validateBody } from '../schemas/validate.js';
import { createProjectSchema, updateProjectSchema } from '../schemas/index.js';
import { ROLES } from '../utils/constants.js';
import { PROJECT_DETAIL, PROJECT_SELECT } from '../models/project.model.js';
import { toDateOrNull } from '../utils/dates.js';

const router = Router();
router.use(authenticate);

// Auto-generate a short project code (e.g. PMS-1A2B3C) when none is supplied.
function generateCode(name) {
  const slug = (name || 'PRJ').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'PRJ';
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${slug}-${rand}`;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { search, status, priority } = req.query;

    const where = {
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.project.findMany({ where, select: PROJECT_SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.project.count({ where }),
    ]);

    return sendPaginated(res, items, { page, limit, total });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id }, select: PROJECT_DETAIL });
    if (!project) throw ApiError.notFound('Project not found');
    return sendSuccess(res, { project });
  }),
);

router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validateBody(createProjectSchema),
  asyncHandler(async (req, res) => {
    const { name, code, description, startDate, endDate, priority, status } = req.body;

    const project = await prisma.project.create({
      data: {
        name,
        code: (code || generateCode(name)).toUpperCase(),
        description: description ?? null,
        startDate: toDateOrNull(startDate),
        endDate: toDateOrNull(endDate),
        priority,
        status,
      },
      select: PROJECT_SELECT,
    });

    return sendSuccess(res, { project }, 201);
  }),
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validateBody(updateProjectSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Project not found');

    const { name, code, description, startDate, endDate, priority, status } = req.body;

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code: code.toUpperCase() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(startDate !== undefined ? { startDate: toDateOrNull(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: toDateOrNull(endDate) } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(status !== undefined ? { status } : {}),
      },
      select: PROJECT_SELECT,
    });

    return sendSuccess(res, { project });
  }),
);

// "Close" a project: mark it completed and cascade-complete its open tasks.
router.patch(
  '/:id/close',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  asyncHandler(async (req, res) => {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Project not found');

    await prisma.$transaction([
      prisma.project.update({ where: { id: req.params.id }, data: { status: 'COMPLETED' } }),
      prisma.task.updateMany({
        where: { projectId: req.params.id, status: { not: 'DONE' } },
        data: { status: 'DONE', progress: 100, completedAt: new Date() },
      }),
    ]);

    const project = await prisma.project.findUnique({ where: { id: req.params.id }, select: PROJECT_SELECT });
    return sendSuccess(res, { project });
  }),
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Project not found');

    const tasks = await prisma.task.findMany({ where: { projectId: req.params.id }, select: { id: true } });
    const taskIds = tasks.map((t) => t.id);

    await prisma.$transaction([
      prisma.taskAssignment.deleteMany({ where: { taskId: { in: taskIds } } }),
      prisma.taskUpdate.deleteMany({ where: { taskId: { in: taskIds } } }),
      prisma.task.deleteMany({ where: { projectId: req.params.id } }),
      prisma.team.updateMany({ where: { projectId: req.params.id }, data: { projectId: null } }),
      prisma.project.delete({ where: { id: req.params.id } }),
    ]);

    return sendSuccess(res, { message: 'Project deleted' });
  }),
);

export default router;
