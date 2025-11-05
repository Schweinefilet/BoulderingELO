import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import * as db from './db';
import { corsOptions } from './config/cors';
import { PORT } from './config/constants';
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
        POST_changePassword: '/api/auth/change-password'
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
  db.initDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 BoulderingELO API v2.0 running on http://localhost:${PORT}`);
        console.log(`📚 API documentation available at http://localhost:${PORT}/`);
      });
    })
    .catch((err) => {
      console.error('❌ Failed to initialize database:', err);
      process.exit(1);
    });
}

export default app;
