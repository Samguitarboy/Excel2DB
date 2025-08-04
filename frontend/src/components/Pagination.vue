<template>
  <div class="card-footer footer-controls">
    <div class="footer-left">
      <div class="d-flex align-items-center">
        <select 
          class="form-select form-select-sm me-2" 
          :value="itemsPerPage"
          @change="$emit('update:itemsPerPage', Number($event.target.value))" 
          style="width: auto;"
        >
          <option value="10">10</option>
          <option value="30">30</option>
          <option value="50">50</option>
        </select>
        <span class="text-muted">
          共 {{ totalItems }} 筆資料，第 {{ currentPage }} / {{ totalPages }} 頁
        </span>
      </div>
    </div>
    <div class="footer-right">
      <nav v-if="totalPages > 1" class="d-flex align-items-center">
        <ul class="pagination" style="margin-bottom: 0;">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <a class="page-link" href="#" @click.prevent="$emit('changePage', currentPage - 1)">&laquo;</a>
          </li>
          <li v-for="(page, index) in displayedPages" :key="index" class="page-item" :class="{ active: page === currentPage, disabled: page === '...' }">
            <span v-if="page === '...'" class="page-link">...</span>
            <a v-else class="page-link" href="#" @click.prevent="$emit('changePage', page)">{{ page }}</a>
          </li>
          <li class="page-item" :class="{ disabled: currentPage === totalPages }">
            <a class="page-link" href="#" @click.prevent="$emit('changePage', currentPage + 1)">&raquo;</a>
          </li>
        </ul>
        <div class="input-group input-group-sm ms-2" style="width: 120px;">
          <input 
            type="number" 
            class="form-control" 
            :value="jumpPage"
            @input="updateJumpPage"
            :min="1" 
            :max="totalPages"
          >
          <button class="btn btn-outline-secondary" type="button" @click="$emit('goToPage')">前往</button>
        </div>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// --- Props ---
const props = defineProps({
  totalItems: { type: Number, required: true },   // 資料總筆數
  currentPage: { type: Number, required: true },  // 目前頁碼
  totalPages: { type: Number, required: true },   // 總頁數
  itemsPerPage: { type: Number, required: true }, // 每頁顯示筆數
  jumpPage: { type: Number, required: true }      // 跳轉頁碼輸入框的值 (v-model)
});

// --- Emits ---
const emit = defineEmits([
  'update:itemsPerPage', // 更新每頁顯示筆數
  'changePage',          // 切換頁碼
  'goToPage',            // 執行頁碼跳轉
  'update:jumpPage'      // 更新跳轉頁碼的值 (v-model)
]);

/**
 * 當跳轉輸入框的值改變時，觸發事件以更新父元件的狀態
 */
function updateJumpPage(event) {
  emit('update:jumpPage', Number(event.target.value));
}

/**
 * 計算要顯示在分頁控制項中的頁碼陣列
 * - 目標：在保持簡潔的同時，讓使用者能方便地在第一頁、最後一頁以及目前頁附近切換。
 * - 範例：[1, '...', 5, 6, 7, '...', 20]
 */
const displayedPages = computed(() => {
  const total = props.totalPages;
  const current = props.currentPage;
  const pages = [];

  // 如果總頁數不多，直接顯示所有頁碼
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  // 核心邏輯：總是顯示第一頁、最後一頁，以及目前頁的前後一頁
  pages.push(1); // 顯示第一頁

  // 如果目前頁碼離第一頁太遠，顯示省略號
  if (current > 3) {
    pages.push('...');
  }

  // 計算中間要顯示的頁碼範圍
  const startPage = Math.max(2, current - 1);
  const endPage = Math.min(total - 1, current + 1);

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  // 如果目前頁碼離最後一頁太遠，顯示省略號
  if (current < total - 2) {
    pages.push('...');
  }

  pages.push(total); // 顯示最後一頁
  
  return pages;
});
</script>

<style scoped>
.footer-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  padding: 0.75rem 1.25rem;
}

.footer-left, .footer-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

@media (max-width: 992px) {
  .footer-controls {
    flex-direction: column;
  }
  .footer-right {
    margin-top: 1rem;
  }
}
</style>
