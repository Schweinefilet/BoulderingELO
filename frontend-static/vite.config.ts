import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Allow overriding the base path for GitHub Pages builds while keeping local dev at '/'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    base: env.VITE_BASE ?? '/',
  }
})
