import mongoSanitize from 'express-mongo-sanitize';

/**
 * MongoDB NoSQL Query Injection Sanitizer
 * Strips out any key starting with '$' or '.' from req.body, req.query, and req.params
 * to prevent operator injection in Mongoose queries (e.g. { username: { "$gt": "" } }).
 */
export const mongoSanitizer = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[Security Alert] Sanitized suspicious NoSQL operator key '${key}' from request IP: ${req.ip}`);
  }
});

/**
 * Recursive String XSS & HTML Tag Sanitizer Middleware
 * Cleans dangerous script tags and inline event handlers from user-submitted form data
 */
export const sanitizeXSSInputs = (req, res, next) => {
  const sanitizeValue = (val) => {
    if (typeof val === 'string') {
      return val
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript\s*:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const cleanedObj = {};
      for (const k in val) {
        if (Object.prototype.hasOwnProperty.call(val, k)) {
          cleanedObj[k] = sanitizeValue(val[k]);
        }
      }
      return cleanedObj;
    }
    if (Array.isArray(val)) {
      return val.map(sanitizeValue);
    }
    return val;
  };

  try {
    if (req.body) req.body = sanitizeValue(req.body);
    if (req.query) req.query = sanitizeValue(req.query);
  } catch (err) {
    console.warn('[Sanitizer Warning] Error during input sanitization:', err.message);
  }
  next();
};
