/**
 * Firasah AI v2.0.0.1
 * Main Application Entry Point
 */

import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

// Import routes
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';

// Import middleware
import { errorHandler } from './middleware/auth.js';

// Import Swagger config
import { specs } from './config/swagger.js';

const app: Express = express();
const PORT = parseInt(process.env.PORT || '8080', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Middleware Setup
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
})); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

/**
 * Request Logging Middleware
 */
app.use((req: Request, res: Response, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

/**
 * Swagger Documentation
 */
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(specs, {
  swaggerOptions: {
    url: '/swagger.json',
  },
}));

/**
 * Swagger JSON endpoint
 */
app.get('/swagger.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

/**
 * Routes Setup
 */
app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);

/**
 * 404 Not Found Handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
  });
});

/**
 * Error Handler Middleware
 */
app.use(errorHandler);

/**
 * Server Startup
 */
const server = app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 Firasah AI v2 Server is Running');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${NODE_ENV}`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📚 Available Routes:');
  console.log('   GET /                - Health Check');
  console.log('   GET /health          - Detailed Health Status');
  console.log('   POST /api/auth/register  - User Registration');
  console.log('   POST /api/auth/login     - User Login');
  console.log('   GET /api/auth/profile    - Get Profile (Protected)');
  console.log('   PUT /api/auth/profile    - Update Profile (Protected)');
  console.log('   POST /api/auth/change-password - Change Password (Protected)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📖 API Documentation:');
  console.log(`   🎯 Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log('═══════════════════════════════════════════════════════════════');
});

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', () => {
  console.log('\n📛 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📛 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;
