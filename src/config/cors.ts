import cors from 'cors';
import { ALLOWED_ORIGINS } from './constants';

/**
 * CORS configuration for the application
 */
export const corsOptions = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    console.log('CORS check - Origin:', origin, 'Allowed origins:', ALLOWED_ORIGINS);
    
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      console.log('✓ CORS allowed for:', origin);
      callback(null, true);
    } else {
      console.log('✗ CORS blocked for:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
});
