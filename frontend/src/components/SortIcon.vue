<template>
  <span class="sort-icon-wrapper">
    <i :class="[iconClass, { 'active-icon': active }]" class="sort-icon"></i>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: String,
    default: 'asc'
  }
});

const iconClass = computed(() => {
  if (!props.active) {
    return 'bi bi-arrow-down-up'; // 預設、未啟用時的圖示
  }
  return props.sortOrder === 'asc' ? 'bi bi-arrow-up-short' : 'bi bi-arrow-down-short';
});
</script>

<style scoped>
.sort-icon-wrapper {
  display: inline-block;
  margin-left: 8px;
  width: 1em; /* 確保佔用空間一致，防止跳動 */
  text-align: center;
  vertical-align: -0.125em; /* 微調垂直對齊 */
}

.sort-icon {
  color: #a0a0a0; /* 未啟用時的顏色 */
  transition: color 0.2s ease-in-out, transform 0.2s ease-in-out;
  display: inline-block; /* 為了 transform 動畫 */
}

/* 當滑鼠懸停在 th 上時，如果圖示不是 active 狀態，就讓它變亮一點 */
th:hover .sort-icon:not(.active-icon) {
  color: #d0d0d0;
}

/* active 狀態的圖示 */
.active-icon {
  color: #ffffff !important; /* 啟用時的顏色，用 !important 覆蓋 hover 效果 */
  transform: scale(1.3);
}
</style>