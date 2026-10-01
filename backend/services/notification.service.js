// Notification service: persists in-app notifications and optionally delivers
// an email copy via Nodemailer when SMTP credentials are configured.
import nodemailer from 'nodemailer';
import { prisma } from '../database/prisma.js';
import { NOTIFICATION_SELECT } from '../models/notification.model.js';
import { NOTIFICATION_TYPE } from '../utils/constants.js';

let transporter = null;
let transporterChecked = false;

function getTransporter() {
  if (transporterChecked) return transporter;
  transporterChecked = true;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.info('[notifications] SMTP not configured - email alerts disabled, using in-app only.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

async function sendEmail(user, subject, text) {
  const tx = getTransporter();
  if (!tx) return false;
  try {
    await tx.sendMail({
      from: process.env.MAIL_FROM || 'no-reply@pms.local',
      to: user.email,
      subject,
      text,
    });
    return true;
  } catch (err) {
    console.warn('[notifications] email delivery failed:', err.message);
    return false;
  }
}

// Creates one notification row (and best-effort email) for a single user.
export async function notifyUser({ userId, type, title, message, link, email = false }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, isActive: true },
  });
  if (!user || !user.isActive) return null;

  let emailSent = false;
  if (email) {
    emailSent = await sendEmail(user, title, `${message}\n\n${link ? `Open: ${link}` : ''}`);
  }

  return prisma.notification.create({
    data: { userId, type, title, message, link, emailSent },
    select: NOTIFICATION_SELECT,
  });
}

export async function notifyMany(userIds, payload) {
  const unique = [...new Set(userIds)];
  return Promise.all(unique.map((userId) => notifyUser({ ...payload, userId })));
}

export const notificationService = {
  notifyUser,
  notifyMany,
  types: NOTIFICATION_TYPE,
};
