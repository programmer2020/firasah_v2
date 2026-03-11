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
import soundFilesRoutes from './routes/soundFilesRoutes.js';
import kpisRoutes from './routes/kpisRoutes.js';
import evidencesRoutes from './routes/evidencesRoutes.js';
import evaluationsRoutes from './routes/evaluationsRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import schoolsRoutes from './routes/schoolsRoutes.js';
import teachersRoutes from './routes/teachersRoutes.js';
import classesRoutes from './routes/classesRoutes.js';
import subjectsRoutes from './routes/subjectsRoutes.js';
import gradesRoutes from './routes/gradesRoutes.js';
import sectionsRoutes from './routes/sectionsRoutes.js';
import configRoutes from './routes/configRoutes.js';

// Import middleware
import { errorHandler } from './middleware/auth.js';

// Import Swagger config
import { specs } from './config/swagger.js';

const app: Express = express();
const PORT = process.env.PORT || 5000;
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

// UTF-8 Encoding headers middleware - only for API routes, not for HTML pages
app.use((req: Request, res: Response, next) => {
  if (!req.path.startsWith('/api-docs') && !req.path.startsWith('/swagger')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Accept-Charset', 'utf-8');
  }
  next();
});

// Configure CORS for development and production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:8080',
  process.env.CORS_ORIGIN || '',
].filter(Boolean);

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN || '*'
    : allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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
app.use('/api-docs', swaggerUi.serveFiles(specs));
app.get('/api-docs', swaggerUi.setup(specs, {
  swaggerOptions: {
    url: '/swagger.json',
    persistAuthorization: true,
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
app.use('/api/config', configRoutes);
app.use('/api/sound-files', soundFilesRoutes);
app.use('/api/kpis', kpisRoutes);
app.use('/api/evidences', evidencesRoutes);
app.use('/api/evaluations', evaluationsRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/sections', sectionsRoutes);

/**
 * 404 Handler - API endpoint not found
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
    method: req.method,
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
  console.log('   ');
  console.log('   🔐 Authentication Routes:');
  console.log('   POST /api/auth/register  - User Registration');
  console.log('   POST /api/auth/login     - User Login');
  console.log('   GET /api/auth/profile    - Get Profile (Protected)');
  console.log('   PUT /api/auth/profile    - Update Profile (Protected)');
  console.log('   POST /api/auth/change-password - Change Password (Protected)');
  console.log('   ');
  console.log('   📁 CRUD Routes:');
  console.log('   GET /api/sound-files     - Get all sound files');
  console.log('   POST /api/sound-files    - Create sound file');
  console.log('   PUT /api/sound-files/:id - Update sound file');
  console.log('   DELETE /api/sound-files/:id - Delete sound file');
  console.log('   ');
  console.log('   GET /api/kpis     - Get all KPIs');
  console.log('   POST /api/kpis    - Create KPI');
  console.log('   PUT /api/kpis/:id - Update KPI');
  console.log('   DELETE /api/kpis/:id - Delete KPI');
  console.log('   ');
  console.log('   GET /api/evidences     - Get all evidences');
  console.log('   POST /api/evidences    - Create evidence');
  console.log('   PUT /api/evidences/:id - Update evidence');
  console.log('   DELETE /api/evidences/:id - Delete evidence');
  console.log('   ');
  console.log('   GET /api/evaluations     - Get all evaluations');
  console.log('   POST /api/evaluations    - Create evaluation');
  console.log('   PUT /api/evaluations/:id - Update evaluation');
  console.log('   DELETE /api/evaluations/:id - Delete evaluation');
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
