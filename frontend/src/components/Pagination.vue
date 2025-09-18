<template>
  <div :class="['card-footer d-flex align-items-center flex-wrap gap-3', justifyContent]">
    <!-- 每頁顯示數量 -->
    <div v-if="showItemsPerPage" class="d-flex align-items-center">
      <label for="itemsPerPage" class="form-label me-2 mb-0 text-nowrap">每頁顯示</label>
      <select id="itemsPerPage" class="form-select form-select-sm" style="width: auto;"
              :value="itemsPerPage"
              @change="$emit('update:itemsPerPage', parseInt($event.target.value))">
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>
    </div>

    <!-- 分頁控制 -->
    <nav aria-label="Page navigation">
      <ul class="pagination mb-0">
        <li class="page-item" :class="{ disabled: currentPage === 1 }">
          <a class="page-link" href="#" @click.prevent="$emit('change-page', currentPage - 1)">&laquo;</a>
        </li>
        <li v-for="page in pageRange" :key="page"
            class="page-item" :class="{ active: page === currentPage, disabled: page === '...' }">
          <a class="page-link" href="#" @click.prevent="page !== '...' && $emit('change-page', page)">
            {{ page }}
          </a>
        </li>
        <li class="page-item" :class="{ disabled: currentPage === totalPages || totalPages === 0 }">
          <a class="page-link" href="#" @click.prevent="$emit('change-page', currentPage + 1)">&raquo;</a>
        </li>
      </ul>
    </nav>

    <!-- 跳轉頁面 -->
    <div v-if="showJumpToPage" class="d-flex align-items-center">
      <span class="me-2 text-nowrap">共 {{ totalItems }} 筆資料</span>
      <input type="number" class="form-control form-control-sm" style="width: 70px;"
             :value="jumpPage"
             @input="$emit('update:jumpPage', $event.target.value)"
             @keyup.enter="$emit('go-to-page')">
      <button class="btn btn-sm btn-outline-secondary ms-2" @click="$emit('go-to-page')">跳轉</button>
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
  jumpPage: { type: [Number, String], required: true },
  showItemsPerPage: { type: Boolean, default: true }, // 新增 prop
  showJumpToPage: { type: Boolean, default: true },    // 新增 prop
  justifyContent: { type: String, default: 'justify-content-between' } // 新增 prop
});

defineEmits(['update:itemsPerPage', 'change-page', 'go-to-page', 'update:jumpPage']);

const pageRange = computed(() => {
  if (props.totalPages === 0) return [1];
  
  const range = [];
  const delta = 2;
  const left = props.currentPage - delta;
  const right = props.currentPage + delta;
  
  for (let i = 1; i <= props.totalPages; i++) {
    if (i === 1 || i === props.totalPages || (i >= left && i <= right)) {
      range.push(i);
    }
  }

  const withDots = [];
  let last;
  for (const page of range) {
    if (last && page - last > 1) {
      withDots.push('...');
    }
    withDots.push(page);
    last = page;
  }
  return withDots;
});
</script>