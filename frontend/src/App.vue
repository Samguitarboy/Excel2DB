<template>
  <!-- router-view 是 Vue Router 的核心元件，用於顯示當前路由對應的頁面元件 -->
  <router-view />
  
  <!-- 全域載入指示器 -->
  <!-- 當 useLoading composable 中的 isLoading 狀態為 true 時，顯示此元件 -->
  <LoadingSpinner v-if="isLoading" />
</template>

<script setup>
import LoadingSpinner from './components/LoadingSpinner.vue';
import { useLoading } from './composables/useLoading';

// 從 useLoading composable 中取得 isLoading 狀態
// 這個狀態由 api.js 中的 axios 攔截器控制
const { isLoading } = useLoading();
</script>

<style>
/* 全域樣式 */
/* 這些樣式會影響整個應用程式 */
body {
  background-color: #f8f9fa;
}

.card {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
</style>
