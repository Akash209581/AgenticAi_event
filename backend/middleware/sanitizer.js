import mongoSanitize from 'express-mongo-sanitize';

/**
 * MongoDB NoSQL Query Injection Sanitizer
 * Strips out any key starting with '$' or '.' from req.body, req.query, and req.params
 * to prevent operator injection in Mongoose queries (e.g. { username: { "$gt": "" } }).
 */
export const mongoSanitizer = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[Security Alert] Sanitized suspicious key '${key}' from request IP: ${req.ip}`);
  }
});
