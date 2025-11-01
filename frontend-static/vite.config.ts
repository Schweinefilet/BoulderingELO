import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves from /BoulderingELO/ not root
export default defineConfig({
  plugins: [react()],
  base: '/BoulderingELO/',
})
