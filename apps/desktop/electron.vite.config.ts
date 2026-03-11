import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@myclaw/gateway': resolve(__dirname, '../../packages/gateway/src'),
        '@myclaw/logger': resolve(__dirname, '../../packages/logger/src'),
        '@myclaw/storage': resolve(__dirname, '../../packages/storage/src'),
        '@myclaw/env-manager': resolve(__dirname, '../../packages/env-manager/src')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react()]
  }
})
