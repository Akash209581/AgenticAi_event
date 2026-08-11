import rateLimit from 'express-rate-limit';

/**
 * Custom Key Generator for Campus NAT-Aware Rate Limiting
 * Keying by request body identifier/email/regNo/aiId or params ensures students sharing
 * the same university Wi-Fi NAT public IP address do not block each other.
 */
const getKeyFromReq = (req) => {
  if (req.params && req.params.identifier) {
    return `usr_${String(req.params.identifier).trim().toLowerCase()}`;
  }
  if (req.body) {
    const rawId = req.body.identifier || req.body.email || req.body.regNo || req.body.username || req.body.leaderRegNo || req.body.aiId;
    if (rawId && typeof rawId === 'string' && rawId.trim()) {
      return `usr_${rawId.trim().toLowerCase()}`;
    }
  }
  const clientIp = req.headers['x-forwarded-for']
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : req.ip;
  return `ip_${clientIp}`;
};

/**
 * 1. Authentication & Event Action Rate Limiter (Campus NAT-Tuned)
 */
export const authRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 10000, // Max 10,000 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: getKeyFromReq,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please wait a moment and try again.'
    });
  }
});

/**
 * 2. Registration Rate Limiter (Campus NAT-Tuned)
 */
export const registrationRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 10000, // Max 10,000 registration requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: getKeyFromReq,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'High registration activity detected. Please wait a moment.'
    });
  }
});

/**
 * 3. Public API Rate Limiter (Campus NAT-Tuned)
 */
export const publicApiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 50000, // 50,000 requests per minute for bulk campus Wi-Fi traffic
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'High traffic volume from your network location. Please wait a moment.'
    });
  }
});
