import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { db, checkDbHealth } from './db/connection.js';
import { startNotificationScheduler, stopNotificationScheduler } from './services/notificationScheduler.js';

const app = express();

// ============================================================================
// Global Middlewares
// ============================================================================

// Cookie parser for secure HttpOnly sessions
app.use(cookieParser());

// CORS configuration supporting HttpOnly cookies and credentials
const configuredOrigins = (config.corsOrigin || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    config.frontendUrl,
    ...configuredOrigins,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ].filter(Boolean))
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || allowedOrigins.includes(origin) || config.corsOrigin === '*') {
        callback(null, origin || true);
      } else {
        callback(null, origin);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (clean development logs)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// ============================================================================
// API Routes
// ============================================================================
app.use('/api', apiRouter);

// Root & Health check routes
app.get('/', (req, res) => {
  res.json({
    name: 'Salah Companion API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

app.get('/health', async (req, res) => {
  const dbHealth = await checkDbHealth();
  const statusCode = dbHealth.connected ? 200 : 503;
  res.status(statusCode).json({
    success: dbHealth.connected,
    status: dbHealth.connected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'Salah Companion Backend',
    database: dbHealth,
  });
});

// ============================================================================
// Error Handlers
// ============================================================================
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================================
// Server Initialization & Graceful Shutdown
// ============================================================================
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`🕌 Salah Companion API Server running in ${config.nodeEnv} mode`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`🩺 Health: http://localhost:${config.port}/api/health`);
  console.log(`🔒 CORS Origin: ${config.corsOrigin}`);
  console.log('====================================================');

  // Start background notification scheduler
  startNotificationScheduler();
});

// Graceful cleanup on shutdown
const shutdown = () => {
  console.log('\n[Server] Shutting down gracefully...');
  stopNotificationScheduler();
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    try {
      await db.close();
      console.log('[Database] Database connections closed.');
    } catch (e) {
      console.error('[Database] Error closing database connections:', e);
    }
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err?.message || err);
});

export default app;
