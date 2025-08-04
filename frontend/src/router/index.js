import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

// 使用動態 import() 實現路由懶載入 (Lazy Loading)。
// 這會將每個頁面的程式碼分割成獨立的檔案，只在使用者訪問該頁面時才載入，
// 從而加快應用程式的初始載入速度。
const Home = () => import('../views/Home.vue');
const Login = () => import('../views/Login.vue');

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true }, // 這個 meta 欄位用來標識需要登入才能訪問的路由
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
];

const router = createRouter({
  // 使用 Hash 模式 (`/#/`)。這種模式不需要後端伺服器做特殊設定，對 IIS 部署更友好。
  history: createWebHashHistory(),
  routes,
});

/**
 * 全域前置路由守衛 (Navigation Guard)
 * 
 * 在每次路由切換前執行，用於檢查使用者的認證狀態。
 */
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // 情況1: 目標路由需要認證，但使用者未登入
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // 將使用者導向登入頁
    next({ name: 'Login' });
  
  // 情況2: 使用者已登入，但試圖訪問登入頁
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    // 將使用者導向首頁，避免重複登入
    next({ name: 'Home' });

  // 情況3: 其他所有情況 (無需認證的頁面，或已登入使用者訪問需認證的頁面)
  } else {
    // 允許路由繼續
    next();
  }
});

export default router;