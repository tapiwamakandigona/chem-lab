import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/three')) {
            return 'vendor-three'
          }
          if (id.includes('@react-three/fiber') || id.includes('@react-three/drei')) {
            return 'vendor-r3f'
          }
        }
      }
    }
  }
})
