import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        // 127.0.0.1 (not localhost) — avoids Windows ::1 resolution conflicts
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})
