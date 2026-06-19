import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/repo-adin/', // GitHub kullanıcı adın ve repo adın aynı olmalı
})
