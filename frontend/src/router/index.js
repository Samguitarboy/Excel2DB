import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Login from '../views/Login.vue';
import { useAuth } from '../composables/useAuth';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
];

const router = createRouter({
  history: createWebHashHistory(), // 使用 Hash 模式，對 IIS 部署更友好
  routes,
});

router.beforeEach((to, from, next) => {
  const { isAuthenticated } = useAuth();

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    // 如果目標路由需要驗證且使用者未登入，導向登入頁
    next({ name: 'Login' });
  } else if (to.name === 'Login' && isAuthenticated.value) {
    // 如果使用者已登入，不允許再次進入登入頁，直接導向首頁
    next({ name: 'Home' });
  } else {
    next();
  }
});

export default router;