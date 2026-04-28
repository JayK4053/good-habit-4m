import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite가 React 코드를 해석할 수 있게 해주는 설정입니다.
export default defineConfig({
  plugins: [react()],
})
