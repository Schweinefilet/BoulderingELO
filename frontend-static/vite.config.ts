import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves from root (/)
export default defineConfig({
  plugins: [react()],
  base: '/',
})
