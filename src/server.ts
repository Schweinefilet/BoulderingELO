import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import * as db from './db';
import { corsOptions } from './config/cors';
import { PORT, RENDER_BOOT_TIMEOUT_MS } from './config/constants';
import apiRoutes from './routes';

const app = express();

/**
 * Middleware Configuration
 */
app.use(corsOptions);
app.options('*', cors()); // Handle preflight requests
app.use(bodyParser.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/**
 * Root endpoint - API documentation
 */
app.get('/', (req, res) => {
  res.json({
    name: 'BoulderingELO API',
    version: '2.0.0',
    description: 'Refactored API with improved structure and organization',
    endpoints: {
      auth: {
        POST: '/api/auth/login',
        POST_register: '/api/auth/register',
        POST_changePassword: '/api/auth/change-password',
        POST_forgotPassword: '/api/auth/forgot-password',
        POST_resetPassword: '/api/auth/reset-password'
      },
      climbers: {
        GET: '/api/climbers',
        POST: '/api/climbers (admin)',
        DELETE: '/api/climbers/:id (admin)'
      },
      sessions: {
        GET: '/api/sessions?from=&to=&climberId=',
        GET_byId: '/api/sessions/:id',
        POST: '/api/sessions',
        DELETE: '/api/sessions/:id (admin)'
      },
      leaderboard: {
        GET: '/api/leaderboard?from=&to='
      },
      videos: {
        GET: '/api/videos?status=',
        POST: '/api/videos',
        POST_vote: '/api/videos/:id/vote',
        POST_approve: '/api/videos/:id/approve (admin)',
        POST_reject: '/api/videos/:id/reject (admin)'
      },
      user: {
        PUT_settings: '/api/user/settings'
      },
      settings: {
        GET_wallTotals: '/api/settings/wall-totals',
        POST_wallTotals: '/api/settings/wall-totals (admin)'
      },
      admin: {
        POST_wipe: '/api/admin/wipe-all-data',
        POST_promote: '/api/admin/promote-user',
        POST_fixUsername: '/api/admin/fix-username',
        POST_createAccount: '/api/admin/create-account',
        POST_resetAndSeed: '/api/admin/reset-and-seed (admin)'
      }
    }
  });
});

// Health check endpoint used by keep-warm pings and uptime monitors
app.get('/health', async (req, res) => {
  try {
    // Quick DB check
    const client = await (await import('./db')).getClient();
    try {
      await client.query('SELECT 1');
      res.json({ ok: true, db: 'connected' });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Health check failed:', err.message || err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

/**
 * Mount API routes
 */
app.use('/api', apiRoutes);

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

/**
 * Global error handler
 */
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * Initialize database and start server
 */
if (require.main === module) {
  // Allow skipping DB init in lightweight dev environments
  const skipDb = process.env.SKIP_DB_INIT === 'true';

  let serverStarted = false;
  const startServer = (mode: 'normal' | 'degraded') => {
    if (serverStarted) return;
    serverStarted = true;

    app.listen(PORT, () => {
      if (mode === 'normal') {
        console.log(`🚀 BoulderingELO API v2.0 running on http://localhost:${PORT}`);
        console.log(`📚 API documentation available at http://localhost:${PORT}/`);
      } else {
        console.warn('Starting server before database initialization has completed. Some endpoints may temporarily fail.');
        console.log(`⚠️ BoulderingELO API running in degraded mode on http://localhost:${PORT}`);
      }
    });
  };

  if (skipDb) {
    console.warn('SKIP_DB_INIT is set - skipping database initialization. Some endpoints will be unavailable.');
    startServer('degraded');
  } else {
    const bootTimer = setTimeout(() => {
      if (!serverStarted) {
        console.warn(
          `⏱️ Database initialization exceeded ${RENDER_BOOT_TIMEOUT_MS}ms. Starting server so Render health checks stop restarting it.`
        );
        startServer('degraded');
      }
    }, RENDER_BOOT_TIMEOUT_MS);

    db.initDB()
      .then(() => {
        clearTimeout(bootTimer);
        if (serverStarted) {
          console.log('✅ Database initialization completed after server started.');
        }
        startServer('normal');
      })
      .catch((err) => {
        clearTimeout(bootTimer);
        console.error('❌ Failed to initialize database:', err);
        console.warn('Starting server anyway in degraded mode. Set SKIP_DB_INIT=true to silence this message.');
        startServer('degraded');
      });
  }
}

export default app;
