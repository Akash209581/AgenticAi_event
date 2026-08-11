import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import { connectDB } from './config/db.js';
import registrationRoutes from './routes/registration.js';
import authRoutes from './routes/auth.js';
import { mongoSanitizer, sanitizeXSSInputs } from './middleware/sanitizer.js';
import { authRateLimiter, registrationRateLimiter, publicApiRateLimiter } from './middleware/rateLimiter.js';
import mongoose from 'mongoose';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 6007;
const BASE_API = process.env.BASE_API || '/cseAI';

// 1. Trust Proxy (Crucial for Nginx reverse proxy & accurate IP rate limiting on campus Wi-Fi)
app.set('trust proxy', 1);

// 2. Disable Server Fingerprinting & Enable Security Headers
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false, // Managed by Nginx or client frontend assets
  crossOriginEmbedderPolicy: false
}));

// 3. Response Compression (Gzip / Deflate for speed)
app.use(compression());

// 4. CORS Restrictions
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-admin-token'],
  credentials: true
};
app.use(cors(corsOptions));

// 5. Body Parsing with Payload Size Guard
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// 6. NoSQL & XSS Query Injection Sanitization
app.use(mongoSanitizer);
app.use(sanitizeXSSInputs);

// Global Direct Image / Media Access Guard:
// If a user attempts to open an image or upload URL directly in their browser tab address bar,
// redirect them automatically to the home page ('/')
app.use((req, res, next) => {
  const urlPath = (req.path || '').toLowerCase();
  const isImageFile = /\.(png|jpg|jpeg|gif|webp|avif|svg|ico)$/i.test(urlPath) || urlPath.startsWith('/uploads') || urlPath.startsWith('/images');
  const acceptHeader = (req.headers.accept || '').toLowerCase();
  const fetchDest = (req.headers['sec-fetch-dest'] || '').toLowerCase();
  
  const isDirectNavigation = acceptHeader.includes('text/html') || fetchDest === 'document';

  if (isImageFile && isDirectNavigation) {
    return res.redirect(302, '/');
  }
  next();
});

// Serve static uploaded files (posters / papers) with security protections
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  dotfiles: 'ignore',
  index: false,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  }
})); 

// Connect Database
connectDB(); 

// 7. Apply NAT-Aware Rate Limiters to Specific Sensitive Routes
app.use(`${BASE_API}/register`, registrationRateLimiter);
app.use(`${BASE_API}/team-register`, registrationRateLimiter);
app.use(`${BASE_API}/login`, authRateLimiter);
app.use(`${BASE_API}/admin-login`, authRateLimiter);


// Public API Rate Limiting for all other endpoints
app.use(BASE_API, publicApiRateLimiter);

// Mount Routes with /cseAI prefix
app.use(BASE_API, registrationRoutes);
app.use(BASE_API, authRoutes);

// Health check endpoint (Sanitized response)
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    event: 'Agentic AI Day 2026 Registration API',
    timestamp: new Date().toISOString()
  });
});

// 8. Global Error Handler (Masks stack trace in production)
app.use((err, req, res, next) => {
  console.error('[Global Server Error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected server error occurred. Please try again later.'
      : err.message || 'Internal Server Error'
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🤖 Agentic AI Day Backend Live on Port ${PORT}`);
  console.log(`🔒 Security Hardened | NAT Rate Limiting Active`);
  console.log(`🌐 Base API URL: http://localhost:${PORT}${BASE_API}`);
  console.log(`=======================================================`);
});

// 9. Graceful Shutdown Handlers for PM2 / Systemd
const shutdownGracefully = async (signal) => {
  console.log(`\n[Server] ${signal} signal received. Closing HTTP server gracefully...`);
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close(false);
      console.log('[Server] MongoDB connection closed.');
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
process.on('SIGINT', () => shutdownGracefully('SIGINT'));
