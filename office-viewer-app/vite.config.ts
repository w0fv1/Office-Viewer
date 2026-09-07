import { createServer } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { previewCapabilitiesPlugin } from './scripts/previewCapabilitiesPlugin.js'

export default defineConfig({
  plugins: [react(), previewCapabilitiesPlugin(createServer)],
  test: {
    environment: 'jsdom',
  },
})
