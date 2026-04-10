import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const apiTarget = process.env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8090'
const liveTarget = process.env.VITE_DEV_LIVE_TARGET || 'http://127.0.0.1:80'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['frp.dtu2.xyz'],
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/snapshots': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/live': {
        target: liveTarget,
        changeOrigin: true,
      },
    },
  },
})
