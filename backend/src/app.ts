import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, validateConfig } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';

const app = express();

// Validate configuration on startup
validateConfig();

// Security middleware
app.use(helmet());
// Allow both local dev URL and production frontend URL(s)
const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:5173',   // Main frontend (dev)
  'http://localhost:5174',   // Admin dashboard (dev)
  'http://localhost:4199',   // Admin dashboard (preview)
  'https://topup.lorndavid.online',
  'https://www.topup.lorndavid.online',
  // Allow Vercel preview deployments (for testing before going live)
  ...(process.env.EXTRA_CORS_ORIGINS ? process.env.EXTRA_CORS_ORIGINS.split(',') : []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow any of the configured origins (exact match or subdomain match)
      if (allowedOrigins.some((o) => origin.startsWith(o))) {
        return callback(null, true);
      }
      // Deny unknown origins
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  })
);

// Body parsing
// IMPORTANT: Capture raw body for CutLuy webhook signature verification BEFORE JSON parsing.
// We use express.raw() for just the CutLuy route, which preserves the raw Buffer.
// Then we manually parse it as JSON so the route handler gets both req.body and req.rawBody.
app.use('/api/webhooks/cutluy', express.raw({ type: '*/*', limit: '1mb' }));
app.use('/api/webhooks/cutluy', (req, _res, next) => {
  try {
    // Save the raw body as string for signature verification
    (req as any).rawBody = (req.body as Buffer).toString('utf8');
    // Parse JSON for the route handler
    req.body = JSON.parse((req as any).rawBody);
  } catch {
    // If it's not valid JSON, leave body as-is
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging
if (config.isDev) {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
