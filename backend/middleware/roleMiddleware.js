// Role authorization middleware supporting all 10 roles
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated user.'
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    // Admin always has access to all routes
    if (userRole === 'admin' || normalizedAllowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access forbidden: Required role [${allowedRoles.join(', ')}], current role is [${req.user.role}]`
    });
  };
}

module.exports = authorizeRoles;
