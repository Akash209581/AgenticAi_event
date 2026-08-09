import crypto from 'crypto';

// Generate a deterministic or environment-driven Admin Authorization Secret Token
export const getAdminSecretToken = () => {
  const secret = process.env.ADMIN_PASSWORD || 'vucse2026_admin_secret_key';
  return crypto.createHash('sha256').update(`vucse_admin_auth_${secret}`).digest('hex');
};

/**
 * Middleware to protect sensitive administrative database endpoints
 * Prevents unauthorized students or internet users from dumping student database records via direct URL access.
 */
export const requireAdminAuth = (req, res, next) => {
  try {
    const providedToken = req.headers['x-admin-token'] || req.query.adminToken;
    const validToken = getAdminSecretToken();

    if (!providedToken || providedToken !== validToken) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied: Admin authorization token required to view registration database records.'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: Invalid or expired admin credentials.'
    });
  }
};
