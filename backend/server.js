import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import registrationRoutes from './routes/registration.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 6007;
const BASE_API = process.env.BASE_API || '/cseAI';

// Middleware
app.use(cors());
app.use(express.json());

// Connect Database
connectDB();

// Mount Routes with /cseAI prefix
app.use(BASE_API, registrationRoutes);
app.use(BASE_API, authRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    event: 'Agentic AI Day 2026 Registration API',
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

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🤖 Agentic AI Day Backend Server Live on Port ${PORT}`);
  console.log(`🌐 Base API URL: http://localhost:${PORT}${BASE_API}`);
  console.log(`=======================================================`);
});
