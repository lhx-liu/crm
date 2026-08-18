import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // 手动分包：将大型第三方库拆分为独立 chunk，
        // 便于浏览器并行下载与长效缓存（库不变则无需重新下载）
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-echarts': ['echarts', 'echarts-for-react'],
          'vendor-xlsx': ['xlsx'],
          'vendor-dayjs': ['dayjs'],
        },
      },
    },
  },
})
