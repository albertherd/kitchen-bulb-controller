import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // For GitHub Pages: set to '/your-repo-name/'
  // For custom domain or local: use '/'
  base: '/',
  define: {
    __SIMULATE_MODE__: JSON.stringify(process.env.VITE_SIMULATE_MODE === 'true')
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: 'all',
  }
})
