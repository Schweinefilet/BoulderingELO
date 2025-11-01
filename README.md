# BoulderingELO — minimal scaffold

This repository is a minimal TypeScript Node scaffold implementing the bouldering session scoring model described in the project spec.

What is included
- score implementation: `src/score.ts`
- minimal Express API: `src/server.ts` with endpoints described in the spec
- SQLite storage using `better-sqlite3` in `src/db.ts`
- unit tests for the scoring function in `__tests__/score.test.ts`

Quick start

1. Install dependencies

```bash
npm install
```

2. Run in development (auto-restarts)

```bash
npm run dev
```

3. Build and start

```bash
npm run build
npm start
```

4. Run tests

```bash
npm test
```

Notes
- Database file `data.db` will be created in the repository root when the server starts.
- The server exposes endpoints under `/api/*`:
  - POST `/api/climbers` {name}
  - GET `/api/climbers`
  - POST `/api/sessions` {climberId, date, counts, notes}
  - GET `/api/sessions?from=&to=&climberId=`
  - GET `/api/sessions/:id`
  - GET `/api/leaderboard?from=&to=`

Next steps
- Add frontend (Next.js or Vite + React) and wire UI to these APIs.
- Add admin toggles for decay `r` and base points.
- Add analytic endpoints and CSV export.
# BoulderingELO