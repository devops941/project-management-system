// Dashboard endpoint backing the Project Dashboard screen.
import { Router } from 'express';
import { authenticate } from '../auth/middleware.js';
import { asyncHandler, sendSuccess } from '../utils/http.js';
import { ROLES } from '../utils/constants.js';
import { dashboardStats } from '../services/dashboard.service.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const isPrivileged = req.user.role === ROLES.ADMIN || req.user.role === ROLES.MANAGER;
    const stats = await dashboardStats({ userId: req.user.sub, isPrivileged });
    return sendSuccess(res, stats);
  }),
);

export default router;
