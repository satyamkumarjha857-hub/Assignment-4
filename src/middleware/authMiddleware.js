const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  let token = null;

  // 1. Check Authorization header (Bearer <token> or raw token)
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  // 2. Check x-access-token header
  if (!token && req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  }

  // 3. Check Cookie header (e.g. token=...)
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const cookie of cookies) {
      const [name, val] = cookie.trim().split('=');
      if (name === 'token' && val) {
        token = decodeURIComponent(val);
        break;
      }
    }
  }

  // If no token is provided -> 403 Forbidden as per Lab specification Fig 2
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'supersecretjwtkeyforlab4webdev3';
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { id, username, email, role, iat, exp }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Role-Based Access Control (RBAC) middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied: insufficient permissions',
        requiredRoles: allowedRoles,
        currentRole: req.user ? req.user.role : 'none'
      });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  authorizeRoles
};
