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

const props = defineProps({
  totalItems: { type: Number, required: true },
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  itemsPerPage: { type: Number, required: true },
  jumpPage: { type: Number, required: true }
});

const emit = defineEmits(['update:itemsPerPage', 'changePage', 'goToPage', 'update:jumpPage']);

function updateJumpPage(event) {
  emit('update:jumpPage', Number(event.target.value));
}

const displayedPages = computed(() => {
  const total = props.totalPages;
  const current = props.currentPage;
  const maxPagesToShow = 5; // 核心頁碼顯示數量
  const pages = [];

  if (total <= maxPagesToShow + 2) { // 如果總頁數不多，全部顯示
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  }

  pages.push(1); // 顯示第一頁

  if (current > 3) {
    pages.push('...');
  }

  const startPage = Math.max(2, current - 1);
  const endPage = Math.min(total - 1, current + 1);

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

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
