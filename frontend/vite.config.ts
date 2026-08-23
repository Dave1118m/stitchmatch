import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const certPath = path.resolve(__dirname, '../certs/cert.pem')
const keyPath = path.resolve(__dirname, '../certs/key.pem')

const httpsOptions = (fs.existsSync(certPath) && fs.existsSync(keyPath))
  ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
  : undefined

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    https: httpsOptions,
    proxy: {
      '/api': {
        target: 'https://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'https://localhost:5000',
        ws: true,
        secure: false,
      },
    },
  },
})