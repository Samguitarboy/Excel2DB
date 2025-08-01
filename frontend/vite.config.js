import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 設定代理，解決前端跨域問題
    proxy: {
      // 當請求路徑以 /api 開頭時，將其轉發到後端伺服器
      '/api': {
        target: 'http://localhost:50123', // --- 修改後端 Port ---
        changeOrigin: true, // 需要更改 origin 來避免 CORS 錯誤
      },
    },
  },
});