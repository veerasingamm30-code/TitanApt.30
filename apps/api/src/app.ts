import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { env, isProduction, trustedOrigins } from './env.js';
import { requestId } from './middleware/requestId.js';
import { attachRequestIdLocals, generalLimiter } from './middleware/rateLimits.js';
import { requireCsrf } from './middleware/csrf.js';
import { attachSession } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { contentRouter } from './routes/content.js';
import { progressRouter } from './routes/progress.js';
import { dashboardRouter } from './routes/dashboard.js';
import { practiceRouter } from './routes/practice.js';
import { mockRouter } from './routes/mock.js';
import { companiesRouter } from './routes/companies.js';
import { readinessRouter } from './routes/readiness.js';
import { adminRouter } from './routes/admin.js';

export const app = express();

app.disable('x-powered-by');
if (env.TRUST_PROXY) app.set('trust proxy', 1);

app.use(requestId);
app.use(attachRequestIdLocals);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", ...trustedOrigins],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
);
app.use(
  cors({
    origin: trustedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  }),
);
app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());
app.use(attachSession);

app.use('/health', healthRouter);
app.use('/api', generalLimiter, requireCsrf);
app.use('/api/auth', authRouter);
app.use('/api', contentRouter);
app.use('/api', progressRouter);
app.use('/api', dashboardRouter);
app.use('/api/practice', practiceRouter);
app.use('/api/mocks', mockRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/readiness', readinessRouter);
app.use('/api/admin', adminRouter);
app.use('/api', notFoundHandler);

const webDist = env.WEB_DIST_DIR ?? join(process.cwd(), 'apps/web/dist');
if (isProduction && existsSync(webDist)) {
  app.use(express.static(webDist, { index: false, maxAge: '1h', etag: true }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) return next();
    return res.sendFile(join(webDist, 'index.html'));
  });
}

app.use(errorHandler);
