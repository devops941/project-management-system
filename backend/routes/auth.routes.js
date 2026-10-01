// Module 1: Admin Login - authentication endpoints.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../database/prisma.js';
import { hashPassword, signToken, verifyPassword } from '../auth/tokens.js';
import { authenticate, authorize } from '../auth/middleware.js';
import { asyncHandler, sendSuccess, ApiError } from '../utils/http.js';
import { validateBody } from '../schemas/validate.js';
import { changePasswordSchema, loginSchema, registerSchema } from '../schemas/index.js';
import { ROLES, ROLE_DESCRIPTIONS, ROLE_NAMES } from '../utils/constants.js';
import { USER_SELECT } from '../models/user.model.js';

const router = Router();

// Throttle login attempts to slow down credential stuffing.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    role: user.role?.name ?? user.role,
    lastLoginAt: user.lastLoginAt,
  };
}

router.post(
  '/login',
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    if (!user.isActive) {
      throw ApiError.forbidden('Your account has been deactivated. Contact an administrator.');
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = signToken({ sub: user.id, role: user.role.name, email: user.email, name: user.name });

    res.cookie('pms_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return sendSuccess(res, { token, user: publicUser(user) });
  }),
);

router.post(
  '/register',
  authenticate,
  authorize(ROLES.ADMIN),
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, role = ROLES.MEMBER, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw ApiError.conflict('A user with this email already exists');

    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) throw ApiError.badRequest(`Unknown role: ${role}`);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone: phone ?? null,
        passwordHash: await hashPassword(password),
        roleId: roleRecord.id,
      },
      select: USER_SELECT,
    });

    return sendSuccess(res, { user }, 201);
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });
    if (!user || !user.isActive) throw ApiError.unauthorized('Account is no longer active');
    return sendSuccess(res, { user: publicUser(user) });
  }),
);

router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) throw ApiError.notFound('User not found');

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    return sendSuccess(res, { message: 'Password updated successfully' });
  }),
);

router.post('/logout', authenticate, (req, res) => {
  res.clearCookie('pms_token');
  return sendSuccess(res, { message: 'Signed out' });
});

// Exposes the role catalogue so the Angular admin forms can render selectors.
router.get('/roles', authenticate, (_req, res) =>
  sendSuccess(
    res,
    ROLE_NAMES.map((name) => ({ name, description: ROLE_DESCRIPTIONS[name] })),
  ),
);

export default router;
