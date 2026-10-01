// Notification model helpers.
import { prisma } from '../database/prisma.js';

export const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  message: true,
  link: true,
  isRead: true,
  emailSent: true,
  createdAt: true,
};

export function listForUser(userId, { onlyUnread = false, skip = 0, take = 20 } = {}) {
  const where = { userId, ...(onlyUnread ? { isRead: false } : {}) };
  return prisma.$transaction([
    prisma.notification.findMany({ where, select: NOTIFICATION_SELECT, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.notification.count({ where }),
  ]);
}

export function unreadCount(userId) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export function create(data) {
  return prisma.notification.create({ data, select: NOTIFICATION_SELECT });
}

export function markRead(userId, ids) {
  return prisma.notification.updateMany({
    where: { userId, ...(ids?.length ? { id: { in: ids } } : {}) },
    data: { isRead: true },
  });
}
