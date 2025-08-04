import { ref } from 'vue';

// 在模組作用域中建立一個 ref，使其在整個應用程式中成為單例 (singleton)
const isLoading = ref(false);

/**
 * 全域載入狀態管理的 Composable
 * 
 * @returns {object} 包含 isLoading 狀態和控制函式的物件。
 * - isLoading: 一個唯讀的 ref，用於判斷當前是否應顯示載入動畫。
 * - showLoading: 一個函式，用於將 isLoading 設為 true。
 * - hideLoading: 一個函式，用於將 isLoading 設為 false。
 */
export function useLoading() {
  const showLoading = () => {
    isLoading.value = true;
  };

  const hideLoading = () => {
    isLoading.value = false;
  };

  return { isLoading, showLoading, hideLoading };
}
