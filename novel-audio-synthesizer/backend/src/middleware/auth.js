const jwt = require('jsonwebtoken');
const { config } = require('../config');

/**
 * Middleware to authenticate requests via JWT stored in HTTP-only cookie or Authorization header.
 */
function authenticateUser(req, res, next) {
  const token =
    req.cookies?.token ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

/**
 * Optional authentication middleware: populates req.user if valid token present, does not block.
 */
function optionalAuth(req, _res, next) {
  const token =
    req.cookies?.token ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtSecret);
    } catch (_err) {
      // Ignored for optional auth
    }
  }
  return next();
}

/**
 * Middleware to enforce specific roles (e.g. 'admin', 'writer')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: role '${req.user.role}' lacks permission for this action.`,
      });
    }
    return next();
  };
}

module.exports = {
  authenticateUser,
  optionalAuth,
  requireRole,
};
