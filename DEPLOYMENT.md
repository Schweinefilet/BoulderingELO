# Deployment Guide

## Overview
This app now uses:
- **Backend**: Node.js + Express + PostgreSQL (deployed on Render)
- **Frontend**: React + Vite (deployed on GitHub Pages)

All users will see the same shared data through the backend API.

---

## Step 1: Deploy Backend to Render

### 1.1 Push Your Code
```bash
git add .
git commit -m "Add PostgreSQL backend and Render config"
git push origin main
```

### 1.2 Create Render Account
- Go to https://render.com
- Sign up / Log in with GitHub

### 1.3 Deploy from render.yaml
1. Click **"New +"** → **"Blueprint"**
2. Connect your GitHub repository: `Schweinefilet/BoulderingELO`
3. Render will detect `render.yaml` and create:
   - PostgreSQL database
   - Web service (API)
4. Click **"Apply"**

### 1.4 Get Your API URL
After deployment completes (3-5 minutes):
- Go to your service dashboard
- Copy the URL (e.g., `https://bouldering-elo-api.onrender.com`)
- **Save this URL** - you'll need it for frontend

---

## Step 2: Deploy Frontend to GitHub Pages

### 2.1 Update API URL
Edit `/frontend-static/.env.production`:
```bash
VITE_API_URL=https://YOUR-RENDER-APP-NAME.onrender.com
VITE_BASE=/BoulderingELO/
```
Replace `YOUR-RENDER-APP-NAME` with your actual Render service name.

### 2.2 Commit Changes
```bash
git add frontend-static/.env.production
git commit -m "Update production API URL"
git push origin main
```

### 2.3 Deploy to GitHub Pages
```bash
cd frontend-static
VITE_BASE=/BoulderingELO/ npm run deploy
```

This will:
- Build the app with production settings
- Push to `gh-pages` branch
- Deploy automatically

### 2.4 Enable GitHub Pages
1. Go to: https://github.com/Schweinefilet/BoulderingELO/settings/pages
2. Source: **Deploy from a branch**
3. Branch: **gh-pages** / (root)
4. Click **Save**

Your app will be live at:
**https://schweinefilet.github.io/BoulderingELO/**

---

## Step 3: Test Your Deployment

1. Visit your GitHub Pages URL
2. Add a climber
3. Submit a session
4. Open in another browser / device
5. Verify you see the same data

---

## Local Development

### Backend
```bash
# Install PostgreSQL locally or use Docker
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres

# Create .env file
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boulderingelo_dev" > .env
echo "NODE_ENV=development" >> .env

# Run backend
npm install
npm run dev
```

Backend runs at: http://localhost:3000

### Frontend
```bash
cd frontend-static
npm install
npm run dev
```

Frontend runs at: http://localhost:5173
(Will automatically connect to local backend)

---

## Troubleshooting

### CORS Errors
If you see CORS errors in browser console:
1. Check `/src/server.ts` line ~12
2. Ensure your GitHub Pages URL is in the `origin` array:
   ```typescript
   origin: [
     'http://localhost:5173',
     'https://schweinefilet.github.io'
   ]
   ```
3. Redeploy backend on Render

### Database Connection Issues
- Check Render logs: Dashboard → Service → Logs
- Verify `DATABASE_URL` environment variable is set
- Database spins down after 15min inactivity on free plan (restarts automatically)

### Frontend Not Updating
```bash
cd frontend-static
rm -rf dist node_modules/.vite
npm install
VITE_BASE=/BoulderingELO/ npm run deploy
```

---

## Cost
- **Render Free Plan**: Includes PostgreSQL + Web Service
  - Database: 90 days retention
  - Service: Spins down after 15min inactivity
- **GitHub Pages**: Free for public repos

---

## Migration from localStorage

If you have existing data in localStorage:
1. Open browser console on old version
2. Run: `localStorage.getItem('boulderingelo_v1')`
3. Copy the JSON output
4. Create a migration script or manually re-enter data

The localStorage version is still available in `/frontend-static/src/lib/storage.ts` history if needed.
