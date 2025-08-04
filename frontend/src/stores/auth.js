import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * 認證狀態管理 Store (Pinia)
 * 
 * 集中管理使用者的 token 和認證狀態。
 */
export const useAuthStore = defineStore('auth', () => {
  // 從 localStorage 初始化 token，確保頁面刷新後狀態不遺失
  const token = ref(localStorage.getItem('token'));

  // 計算屬性，用於判斷使用者是否已登入
  const isAuthenticated = computed(() => !!token.value);

  /**
   * 設定 token，並將其儲存到 localStorage。
   * @param {string} newToken - 從後端獲取的新 token。
   */
  function setToken(newToken) {
    token.value = newToken;
    localStorage.setItem('token', newToken);
  }

  /**
   * 清除 token，並從 localStorage 中移除。
   */
  function clearToken() {
    token.value = null;
    localStorage.removeItem('token');
  }

  /**
   * 登出使用者。
   * 清除 token 並強制跳轉到登入頁。
   */
  function logout() {
    clearToken();
    // 由於此函式可能在 axios 攔截器等非元件環境中被呼叫，
    // 直接操作 window.location 是最可靠的跳轉方式，
    // 可以避免 Vue Router 實例不可用的問題。
    window.location.hash = '/login';
  }

  // 導出 state 和 actions
  return { token, isAuthenticated, setToken, logout, clearToken };
});
