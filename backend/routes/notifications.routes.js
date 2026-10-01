// Module 9: Notifications - per-user in-app notification feed.
import { Router } from 'express';
import { prisma } from '../database/prisma.js';
import { authenticate, authorize } from '../auth/middleware.js';
import { asyncHandler, sendPaginated, sendSuccess, parsePagination } from '../utils/http.js';
import { validateBody } from '../schemas/validate.js';
import { notificationReadSchema } from '../schemas/index.js';
import { ROLES } from '../utils/constants.js';
import { NOTIFICATION_SELECT } from '../models/notification.model.js';
import { runDeadlineScan, deadlineOverview } from '../services/deadline.service.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const onlyUnread = req.query.unread === 'true';
    const where = { userId: req.user.sub, ...(onlyUnread ? { isRead: false } : {}) };

    const [items, total, unread] = await prisma.$transaction([
      prisma.notification.findMany({ where, select: NOTIFICATION_SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.sub, isRead: false } }),
    ]);

    return sendPaginated(res, items, { page, limit, total, unread });
  }),
);

router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const count = await prisma.notification.count({ where: { userId: req.user.sub, isRead: false } });
    return sendSuccess(res, { count });
  }),
);

// Module 8: Deadline Management - upcoming and overdue task lists.
router.get(
  '/deadlines',
  asyncHandler(async (req, res) => {
    const isPrivileged = req.user.role === ROLES.ADMIN || req.user.role === ROLES.MANAGER;
    const overview = await deadlineOverview({ userId: req.user.sub, isPrivileged });
    return sendSuccess(res, overview);
  }),
);

router.patch(
  '/read',
  validateBody(notificationReadSchema),
  asyncHandler(async (req, res) => {
    const { ids } = req.body;
    await prisma.notification.updateMany({
      where: { userId: req.user.sub, ...(ids?.length ? { id: { in: ids } } : {}) },
      data: { isRead: true },
    });
    const unread = await prisma.notification.count({ where: { userId: req.user.sub, isRead: false } });
    return sendSuccess(res, { message: 'Notifications marked as read', unread });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.notification.deleteMany({ where: { id: req.params.id, userId: req.user.sub } });
    return sendSuccess(res, { message: 'Notification removed' });
  }),
);

// Admin trigger for an immediate deadline scan (the same job also runs on cron).
router.post(
  '/scan',
  authorize(ROLES.ADMIN),
  asyncHandler(async (_req, res) => {
    const result = await runDeadlineScan();
    return sendSuccess(res, result);
  }),
);

export default router;
