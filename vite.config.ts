import { defineConfig, Plugin } from 'vite'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

// Plugin to copy libopenmpt.worklet.js to assets folder after build
function copyLibopenmpt(): Plugin {
  return {
    name: 'copy-libopenmpt',
    closeBundle() {
      const src = resolve(__dirname, 'node_modules/chiptune3/libopenmpt.worklet.js')
      const dest = resolve(__dirname, 'dist/assets/libopenmpt.worklet.js')
      copyFileSync(src, dest)
      console.log('Copied libopenmpt.worklet.js to dist/assets/')
    },
  }
}

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Keep chiptune worklet files together so they can import each other
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.includes('libopenmpt') || assetInfo.name?.includes('chiptune')) {
            return 'assets/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['chiptune3'], // Don't prebundle chiptune3
  },
  plugins: [copyLibopenmpt()],
})
