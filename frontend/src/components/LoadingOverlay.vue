<template>
  <div class="loading-overlay">
    <div class="spinner-border text-light" style="width: 3rem; height: 3rem;" role="status">
      <span class="visually-hidden">載入中...</span>
    </div>
    <p v-if="message" class="mt-3 fs-5 text-light">{{ message }}</p>
  </div>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: '正在處理您的請求，請稍候...'
  }
});
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}
</style>