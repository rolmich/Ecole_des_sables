import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Écouter sur toutes les interfaces réseau
    port: 3000,
    strictPort: true,
  }
})
