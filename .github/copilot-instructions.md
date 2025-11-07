# BoulderingELO Copilot Instructions

## Architecture Overview

**Monorepo Structure**: Backend (Node.js) + Frontend (React/Vite) deployed separately:
- Backend: `src/` → PostgreSQL on Render.com (auto-deploys from `main` via `render.yaml`)
- Frontend: `frontend-static/` → GitHub Pages at `/BoulderingELO/` (requires manual `npm run deploy`)

**Critical Split-Brain Risk**: Backend and frontend deploy independently. After backend changes:
1. Push to `main` → Render auto-deploys backend
2. `cd frontend-static && npm run deploy` → Manually deploy frontend to GitHub Pages
3. Missing step 2 = live site shows stale frontend calling new backend APIs (breaks silently)

## Scoring System (Core Business Logic)

The app calculates climbing scores using **diminishing returns** across colors (hardest→easiest):

```typescript
// src/score.ts - ORDER matters! Process hardest colors first
export const ORDER = ['black', 'red', 'orange', 'yellow', 'blue', 'green'];
export const BASE = { black: 120, red: 56, orange: 12.5, yellow: 3.5, blue: 0.75, green: 0.25 };

// Score = Σ (base × [W(cumulative+count) - W(cumulative)]) where W(n) = (1-0.95^n)/(1-0.95)
export function scoreSession(counts: Counts, r = 0.95): number {
  let cum = 0, s = 0;
  for (const color of ORDER) {
    const c = counts[color] || 0;
    if (c > 0) {
      s += BASE[color] * (wSum(cum + c, r) - wSum(cum, r));
      cum += c;  // Accumulate for next color
    }
  }
  return s;
}
```

**Wall Sections**: Sessions track `wallCounts` (overhang/midWall/sideWall/dynamic sections), combined into total `Counts` before scoring. When sections expire, data is **deleted** (not filtered) via `updateSessionWallCounts()`.

## Database Layer (`src/db.ts`)

**PostgreSQL with JSONB**: Sessions store `wall_counts` as JSONB for flexible wall section tracking:
```typescript
await db.addSession(session, counts, wallCounts);  // wallCounts serialized to JSONB
const sessions = await db.getSessions({ from, to, climberId });  // Auto-parses JSONB
```

**Settings Table**: Key-value store for app config (`expiredSections`, `wallTotals`, etc.):
```typescript
await db.setSetting('expiredSections', ['overhang', 'midWall']);
const expired = await db.getSetting('expiredSections') || [];
```

**Transaction Pattern**: Always use BEGIN/COMMIT/ROLLBACK for multi-table updates:
```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... multiple queries
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

## API Routing Pattern

Routes are modular (`src/routes/`) and mounted in `src/routes/index.ts`:
```typescript
// src/routes/adminRoutes.ts
router.post('/expired-sections', authenticateToken, requireAdmin, adminController.addExpiredSection);

// Frontend calls: POST /api/admin/expired-sections
```

**Authentication Middleware**: `authenticateToken` (JWT) + `requireAdmin` (role check) + `optionalAuth` (for public+private views)

## Frontend API Client (`frontend-static/src/lib/api.ts`)

**Environment-Aware API URL**:
```typescript
export const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
// .env.production: VITE_API_URL=https://bouldering-elo-api.onrender.com
// .env.development: Falls back to localhost:3000
```

**Auth Pattern**: JWT stored in localStorage, automatically attached via `getAuthHeaders()`:
```typescript
const response = await fetch(`${API_URL}/api/sessions`, {
  method: 'POST',
  headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

## Critical Deployment Workflow

1. **Backend Changes** → `git push origin main` → Render auto-deploys (3-5 min)
2. **Frontend Changes** → `cd frontend-static && npm run deploy` → GitHub Pages (2 min)
3. **Both Changed** → Do step 1, wait for Render, then step 2

**Base Path Gotcha**: `vite.config.ts` has `base: '/BoulderingELO/'` for GitHub Pages project site. Changing to `/` breaks all routes (404s). Match this in `.env.production`.

## Development Commands

```bash
# Backend (from root)
npm run dev              # ts-node-dev with auto-reload
npm run build && npm start  # Production mode

# Frontend (from frontend-static/)
npm run dev              # Vite dev server (localhost:5173)
npm run build            # Build for production
npm run deploy           # Build + push to gh-pages branch

# Quick start both (from root)
./dev-start.sh           # Starts backend + frontend in parallel
```

## Common Patterns to Follow

**Expire Wall Sections** (Admin feature): DELETE climb data, not filter:
```typescript
// WRONG: Filter during calculation (data still exists)
const activeCounts = combineCounts(wallCounts, { exclude: expiredSections });

// RIGHT: Delete data from database (src/controllers/adminController.ts:209-245)
delete updatedWallCounts[sectionName];
await db.updateSessionWallCounts(session.id, updatedWallCounts, newScore);
```

**Type Safety**: `src/types.ts` defines all shared types. Backend and frontend MUST use identical types for API contracts.

**Error Handling**: Controllers use `sendSuccess(res, data)` and `sendError(res, message, code)` from `src/utils/response.ts` for consistent API responses.

## Testing

```bash
npm test                 # Jest tests in __tests__/
# Currently: score.test.ts validates scoring math
```

## Known Constraints

- Render free tier: Backend sleeps after 15min inactivity (50s cold start)
- PostgreSQL retention: 90 days on free tier
- GitHub Pages: No server-side logic, static assets only
- CORS: `src/config/cors.ts` whitelists `localhost:5173` and `schweinefilet.github.io`
