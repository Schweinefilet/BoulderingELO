import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use VITE_BASE env var when building for GitHub Pages, e.g. /repo-name/
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  plugins: [react()],
  base,
})
