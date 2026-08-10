import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import { connectDB } from './config/db.js';
import registrationRoutes from './routes/registration.js';
import authRoutes from './routes/auth.js';
import { mongoSanitizer } from './middleware/sanitizer.js';
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};
app.use(cors(corsOptions));

// 5. Body Parsing with Payload Size Guard
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// 6. NoSQL Query Injection Sanitization
app.use(mongoSanitizer);

// Serve static uploaded files (posters / papers)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'))); 

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

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    event: 'Agentic AI Day 2026 Registration API',
    environment: process.env.NODE_ENV || 'development',
    baseApi: BASE_API,
    port: PORT,
    endpoints: {
      register: `POST ${BASE_API}/register`,
      login: `POST ${BASE_API}/login`,
      registrations: `GET ${BASE_API}/registrations`,
      stats: `GET ${BASE_API}/stats`
    }
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
