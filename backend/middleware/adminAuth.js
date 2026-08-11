import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const getJwtSecret = () => {
  return process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'vucse2026_default_secret_key_change_in_env';
};

// Legacy static hash fallback for admin
export const getAdminSecretToken = () => {
  const secret = process.env.ADMIN_PASSWORD || 'vucse2026_admin_secret_key';
  return crypto.createHash('sha256').update(`vucse_admin_auth_${secret}`).digest('hex');
};

// Generate Admin JWT Token
export const generateAdminJwt = (username) => {
  return jwt.sign(
    {
      role: 'SUPER_ADMIN',
      username,
      iss: 'vucse_api'
    },
    getJwtSecret(),
    { expiresIn: '12h' }
  );
};

// Generate Student JWT Token
export const generateUserJwt = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      aiId: user.aiId,
      regNo: user.regNo,
      email: user.email,
      name: user.name,
      iss: 'vucse_api'
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
};

// Verify any JWT Token
export const verifyJwtToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (err) {
    return null;
  }
};

/**
 * Middleware to protect administrative database endpoints using JWT
 */
export const requireAdminAuth = (req, res, next) => {
  try {
    const rawHeader = req.headers['x-admin-token'] || req.headers['authorization'] || req.query.adminToken;
    if (!rawHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied: Admin JWT authentication token required.'
      });
    }

    const token = rawHeader.startsWith('Bearer ') ? rawHeader.substring(7) : rawHeader;

    // Check JWT first
    const decoded = verifyJwtToken(token);
    if (decoded && decoded.role === 'SUPER_ADMIN') {
      req.admin = decoded;
      return next();
    }

    // Fallback check static hash
    const legacyToken = getAdminSecretToken();
    if (token === legacyToken) {
      req.admin = { role: 'SUPER_ADMIN', legacy: true };
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Access Denied: Invalid or expired Admin JWT token.'
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: Authentication failure.'
    });
  }
};

/**
 * Middleware to protect student user endpoints using JWT
 */
export const requireUserAuth = (req, res, next) => {
  try {
    const rawHeader = req.headers['authorization'] || req.headers['x-user-token'] || req.body?.token;
    if (!rawHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied: JWT authentication token required.'
      });
    }

    const token = rawHeader.startsWith('Bearer ') ? rawHeader.substring(7) : rawHeader;
    const decoded = verifyJwtToken(token);

    if (!decoded || (!decoded.aiId && !decoded.regNo && !decoded.email)) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied: Invalid or expired JWT user token. Please login again.'
      });
    }

    req.userToken = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: User token validation failed.'
    });
  }
};
