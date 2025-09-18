import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useGuestStore } from '../stores/guest'; // 引入 useGuestStore

// 使用動態 import() 實現路由懶載入 (Lazy Loading)。
// 這會將每個頁面的程式碼分割成獨立的檔案，只在使用者訪問該頁面時才載入，
// 從而加快應用程式的初始載入速度。
const Home = () => import('../views/Home.vue');
const Login = () => import('../views/Login.vue');
const GuestLogin = () => import('../views/GuestLogin.vue'); // 新增的來賓登入頁面
const ApplyForm = () => import('../views/Applyform.vue'); // 新增的申請表單頁面
const Dashboard = () => import('../views/Dashboard.vue'); // 儀表板頁面
const MyApplications = () => import('../views/MyApplications.vue'); // 新增的申請紀錄頁面

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true }, // 這個 meta 欄位用來標識需要登入才能訪問的路由
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/guest-login',
    name: 'GuestLogin',
    component: GuestLogin,
    // 這個路由不需要認證，所以沒有 requiresAuth: true
  },
  {
    path: '/apply',
    name: 'ApplyForm',
    component: ApplyForm,
    // 申請表單頁面無需認證
  },
  {
    path: '/my-applications',
    name: 'MyApplications',
    component: MyApplications,
  },
  {
    path: '/media-loan',
    name: 'MediaLoan',
    component: () => import('../views/MediaLoan.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/regulations',
    name: 'Regulations',
    component: () => import('../views/Regulations.vue'),
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
  const guestStore = useGuestStore();

  const isAuthenticated = authStore.isAuthenticated;
  const isGuest = guestStore.isGuestMode;
  const requiresAuth = to.meta.requiresAuth;

  if (requiresAuth && !isAuthenticated && !isGuest) {
    // 如果路由需要認證，但使用者既不是管理員也不是來賓，則導向登入頁
    next({ name: 'Login' });
  } else if (to.name === 'Login' && isAuthenticated) {
    // 如果已登入的管理員試圖訪問登入頁，將他們導向儀表板
    next({ name: 'Dashboard' });
  } else {
    // 其他所有情況（例如：訪問不需認證的頁面，或已授權的使用者訪問頁面）都允許通過
    next();
  }
});

export default router;