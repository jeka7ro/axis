import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

let gitHash = '1e2b1b5'
let buildNum = '95'

try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim()
  buildNum = execSync('git rev-list --count HEAD').toString().trim()
} catch (e) {
  // fallback if git is unavailable
}

const now = new Date()
const day = String(now.getDate()).padStart(2, '0')
const month = String(now.getMonth() + 1).padStart(2, '0')
const year = now.getFullYear()
const hours = String(now.getHours()).padStart(2, '0')
const minutes = String(now.getMinutes()).padStart(2, '0')
const buildDate = `${day}.${month}.${year} ${hours}:${minutes}`

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_NUMBER__: JSON.stringify(buildNum),
    __BUILD_HASH__: JSON.stringify(gitHash),
    __BUILD_DATE__: JSON.stringify(buildDate)
  },
  server: {
    port: 1987,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
})
