import rateLimit from 'express-rate-limit';

/**
 * Custom Key Generator for NAT-Aware Rate Limiting
 * Keying by request body identifier/email/regNo ensures 6,000+ users sharing
 * the same university Wi-Fi NAT public IP do not block each other.
 */
const getKeyFromReq = (req) => {
  if (req.body) {
    const rawId = req.body.identifier || req.body.email || req.body.regNo || req.body.username || req.body.leaderRegNo;
    if (rawId && typeof rawId === 'string' && rawId.trim()) {
      return `usr_${rawId.trim().toLowerCase()}`;
    }
  }
  // Fallback to Express client IP (handled correctly behind Nginx when trust proxy is enabled)
  return `ip_${req.ip}`;
};

/**
 * 1. Authentication Rate Limiter
 * Restricts brute-force attacks on login / admin-login / user actions per account/identifier.
 */
export const authRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15, // Max 15 attempts per identifier per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getKeyFromReq,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many login or authentication attempts for this identifier. Please try again in 10 minutes.'
    });
  }
});

/**
 * 2. Registration Rate Limiter
 * Restricts spam registration submissions per email or registration number.
 */
export const registrationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8, // Max 8 registration attempts per email/regNo per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getKeyFromReq,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many registration requests for this email or registration number. Please wait 15 minutes.'
    });
  }
});

/**
 * 3. Public API Rate Limiter
 * Generous limits for public GET endpoints (stats, registration counts, etc.)
 * Tuned to accommodate heavy concurrent traffic from 6,000+ users on shared university Wi-Fi.
 */
export const publicApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // 5,000 requests per 15 minutes per IP (NAT shared gateway)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'High traffic detected from your network location. Please wait a moment and try again.'
    });
  }
});
