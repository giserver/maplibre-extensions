/// <reference types="vitest/config" />

import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'MaplibreExtensions',
      fileName: 'index',
    },
    rollupOptions: {
      external: ['maplibre-gl', '@turf/turf', 'uuidv7'],
      output: {
        globals: {
          'maplibre-gl': 'maplibregl',
          '@turf/turf': 'turf',
          'uuidv7': 'uuidv7',
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ["./test/setup.ts"]
  }
})
