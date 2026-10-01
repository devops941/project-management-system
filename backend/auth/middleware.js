import { verifyToken } from './tokens.js';
import { ApiError } from '../utils/http.js';
import { ROLES } from '../utils/constants.js';

// Extracts the bearer token (or the httpOnly cookie) and attaches the decoded
// user to the request. The backend alone owns authentication - Angular never
// validates the JWT itself.
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = bearer || req.cookies?.pms_token;

  if (!token) {
    return next(ApiError.unauthorized('Missing authentication token'));
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    return next(err);
  }
}

// Role-based access control. Usage: authorize(ROLES.ADMIN, ROLES.MANAGER)
export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (allowedRoles.length === 0) return next();
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }
    return next();
  };
}

export const isAdmin = authorize(ROLES.ADMIN);
export const isManager = authorize(ROLES.ADMIN, ROLES.MANAGER);
