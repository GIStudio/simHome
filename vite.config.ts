import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署在子路径 /simHome/ 下
  base: '/simHome/',
  plugins: [react()],
})
