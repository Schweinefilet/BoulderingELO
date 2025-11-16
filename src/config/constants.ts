/**
 * Application-wide constants
 */

export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

export const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://schweinefilet.github.io'
];

export const DEFAULT_SEED_PASSWORD = process.env.DEFAULT_SEED_PASSWORD || 'boulder123';

export const PORT = process.env.PORT || 3000;

// Render's free tier kills services that don't start listening quickly. Allow
// overriding the timeout used before we start the server without a DB.
export const RENDER_BOOT_TIMEOUT_MS = Number(process.env.RENDER_BOOT_TIMEOUT_MS || '45000');

export const VALID_COLORS = ['green', 'blue', 'yellow', 'orange', 'red', 'black'] as const;

export const WALL_MAPPING: { [key: string]: string } = {
  'overhang': 'overhang',
  'midWall': 'midwall',
  'sideWall': 'sidewall'
};
