// Module 2: User Management - admin CRUD for system users.
import { Router } from 'express';
import { prisma } from '../database/prisma.js';
import { authenticate, authorize } from '../auth/middleware.js';
import { asyncHandler, sendPaginated, sendSuccess, ApiError, parsePagination } from '../utils/http.js';
import { validateBody } from '../schemas/validate.js';
import { createUserSchema, updateUserSchema } from '../schemas/index.js';
import { ROLES } from '../utils/constants.js';
import { USER_SELECT, USER_WITH_COUNTS } from '../models/user.model.js';
import { hashPassword } from '../auth/tokens.js';

const router = Router();
router.use(authenticate);

// Managers may browse the directory to assign tasks; only admins may mutate.
router.get(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { search, role, isActive } = req.query;

    const where = {
      ...(search
        ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
        : {}),
      ...(role ? { role: { name: role } } : {}),
      ...(isActive === undefined ? {} : { isActive: isActive === 'true' }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: USER_WITH_COUNTS,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return sendPaginated(res, items, { page, limit, total });
  }),
);

router.get(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        ...USER_SELECT,
        teamMembers: {
          select: { id: true, joinedAt: true, team: { select: { id: true, name: true, project: { select: { name: true } } } } },
        },
        assignments: {
          select: { id: true, task: { select: { id: true, title: true, status: true, dueDate: true, priority: true } } },
        },
      },
    });
    if (!user) throw ApiError.notFound('User not found');
    return sendSuccess(res, { user });
  }),
);

router.post(
  '/',
  authorize(ROLES.ADMIN),
  validateBody(createUserSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, role, phone, isActive } = req.body;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw ApiError.conflict('A user with this email already exists');

    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) throw ApiError.badRequest(`Unknown role: ${role}`);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone: phone ?? null,
        isActive: isActive ?? true,
        passwordHash: await hashPassword(password),
        roleId: roleRecord.id,
      },
      select: USER_WITH_COUNTS,
    });

    return sendSuccess(res, { user }, 201);
  }),
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN),
  validateBody(updateUserSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, role, phone, isActive } = req.body;

    const target = await prisma.user.findUnique({ where: { id: req.params.id }, include: { role: true } });
    if (!target) throw ApiError.notFound('User not found');

    if (email && email.toLowerCase() !== target.email) {
      const clash = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (clash) throw ApiError.conflict('A user with this email already exists');
    }

    // Prevent an admin from locking themselves out of the system.
    if (req.params.id === req.user.sub && isActive === false) {
      throw ApiError.badRequest('You cannot deactivate your own account');
    }

    let roleId;
    if (role && role !== target.role.name) {
      const roleRecord = await prisma.role.findUnique({ where: { name: role } });
      if (!roleRecord) throw ApiError.badRequest(`Unknown role: ${role}`);
      roleId = roleRecord.id;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email: email.toLowerCase() } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(roleId ? { roleId } : {}),
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
      select: USER_WITH_COUNTS,
    });

    return sendSuccess(res, { user });
  }),
);

router.patch(
  '/:id/status',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user.sub) throw ApiError.badRequest('You cannot change your own account status');

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw ApiError.notFound('User not found');

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !target.isActive },
      select: USER_WITH_COUNTS,
    });
    return sendSuccess(res, { user });
  }),
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user.sub) throw ApiError.badRequest('You cannot delete your own account');

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw ApiError.notFound('User not found');

    // Detach the user from all relations before removal.
    await prisma.$transaction([
      prisma.taskAssignment.deleteMany({ where: { userId: req.params.id } }),
      prisma.teamMember.deleteMany({ where: { userId: req.params.id } }),
      prisma.taskUpdate.deleteMany({ where: { userId: req.params.id } }),
      prisma.notification.deleteMany({ where: { userId: req.params.id } }),
      prisma.team.updateMany({ where: { leadId: req.params.id }, data: { leadId: null } }),
      prisma.user.delete({ where: { id: req.params.id } }),
    ]);

    return sendSuccess(res, { message: 'User deleted' });
  }),
);

export default router;
