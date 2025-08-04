import { ref } from 'vue';

// 這個狀態因為在模組作用域中，所以在整個應用程式中是共享的
const isAuthenticated = ref(!!localStorage.getItem('token'));

export function useAuth() {
  const setToken = (token) => {
    localStorage.setItem('token', token);
    isAuthenticated.value = true;
  };

  const logout = () => {
    localStorage.removeItem('token');
    isAuthenticated.value = false;
  };

  return { isAuthenticated, setToken, logout };
}