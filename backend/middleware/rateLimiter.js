import rateLimit from 'express-rate-limit';

/**
 * Custom Key Generator for NAT-Aware Rate Limiting
 * Keying by request body identifier/email/regNo ensures users sharing
 * the same university Wi-Fi NAT public IP do not block each other.
 */
const getKeyFromReq = (req) => {
  if (req.body) {
    const rawId = req.body.identifier || req.body.email || req.body.regNo || req.body.username || req.body.leaderRegNo || req.body.aiId;
    if (rawId && typeof rawId === 'string' && rawId.trim()) {
      return `usr_${rawId.trim().toLowerCase()}`;
    }
  }
  return `ip_${req.ip}`;
};

/**
 * 1. Authentication & Event Action Rate Limiter
 * Increased max limit to prevent 429 Too Many Requests during rapid clicking/event enrollments.
 */
export const authRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5000, // Max 5,000 login/auth attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: getKeyFromReq,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please wait a moment and try again.'
    });
  }
});

/**
 * 2. Registration Rate Limiter
 */
export const registrationRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5000, // Max 5,000 registration attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: getKeyFromReq,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many registration requests. Please wait a moment.'
    });
  }
});

/**
 * 3. Public API Rate Limiter
 */
export const publicApiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20000, // 20,000 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'High traffic detected from your network location. Please wait a moment.'
    });
  }
});


