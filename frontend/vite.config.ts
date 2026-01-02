import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname, join } from 'path'
import { copyFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Plugin to replace environment variables in HTML
const htmlEnvPlugin = () => {
  return {
    name: 'html-env-replace',
    transformIndexHtml(html: string) {
      return html.replace(/%VITE_([^%]+)%/g, (match, envVar) => {
        const value = process.env[`VITE_${envVar}`]
        return value || match
      })
    }
  }
}

// Plugin to copy manifest.json to build output
const copyManifestPlugin = () => {
  return {
    name: 'copy-manifest',
    writeBundle() {
      const manifestPath = join(__dirname, 'public', 'manifest.json')
      const outputPath = join(__dirname, 'dist', 'manifest.json')
      
      if (existsSync(manifestPath)) {
        copyFileSync(manifestPath, outputPath)
        console.log('✅ Copied manifest.json to build output')
      } else {
        console.warn('⚠️ manifest.json not found in public directory')
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    htmlEnvPlugin(),
    copyManifestPlugin()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
})
