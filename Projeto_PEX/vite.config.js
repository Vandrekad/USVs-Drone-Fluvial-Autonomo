import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesiumStatic/node_modules/cesium/Build/Cesium'),
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/cesium/Build/Cesium/**/*',
          dest: 'cesiumStatic',
        },
      ],
    }),
  ],
})
