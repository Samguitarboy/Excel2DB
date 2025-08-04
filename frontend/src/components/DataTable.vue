<template>
  <div :class="{ 'filters-mobile-open': isFilterVisible }">
    <div class="d-grid d-md-none mb-2">
      <button class="btn btn-outline-secondary btn-sm" type="button" @click="isFilterVisible = !isFilterVisible">
        <i class="bi bi-funnel-fill"></i> {{ isFilterVisible ? '隱藏篩選條件' : '顯示篩選條件' }}
      </button>
    </div>
    <div class="table-responsive">
    <table class="table table-striped table-hover rwd-table">
      <thead class="table-dark">
        <tr>
          <th v-for="header in headers" :key="header" @click="$emit('sort', header)" class="sortable-header">
            {{ header }}
            <SortIcon :active="sortKey === header" :sort-order="sortOrder" />
          </th>
          <th class="actions-header"></th>
        </tr>
        <tr class="filter-row">
          <th v-for="header in headers" :key="header + '-filter'">
            <!-- 日期篩選器 -->
            <div v-if="header === '最後存取時間'" class="d-flex align-items-center" style="min-width: 220px;">
              <select
                class="form-select form-select-sm"
                style="width: auto;"
                :value="searchQueries[header].operator"
                @change="$emit('update:searchQueries', { ...searchQueries, [header]: { ...searchQueries[header], operator: $event.target.value } })"
              >
                <option value="gt">晚於</option>
                <option value="lt">早於</option>
              </select>
              <input
                type="date"
                class="form-control form-control-sm ms-1"
                :value="searchQueries[header].value"
                @input="$emit('update:searchQueries', { ...searchQueries, [header]: { ...searchQueries[header], value: $event.target.value } })"
              />
            </div>
            <!-- 下拉選單篩選器 -->
            <select v-else-if="dropdownOptions[header]"
              class="form-select form-select-sm"
              :value="searchQueries[header]"
              @change="$emit('update:searchQueries', { ...searchQueries, [header]: $event.target.value })"
            >
              <option value="">所有</option>
              <option v-for="(option, index) in dropdownOptions[header]" :key="index" :value="option" >
                {{ option }}
              </option>
            </select>
            <!-- 一般文字篩選器 -->
            <input
              v-else
              type="text"
              class="form-control form-control-sm"
              :placeholder="'搜尋 ' + header"
              :value="searchQueries[header]"
              @input="$emit('update:searchQueries', { ...searchQueries, [header]: $event.target.value })"
            />
          </th>
          <th></th> <!-- 操作欄位的篩選列留空 -->
        </tr>
      </thead>
      <tbody>
        <tr v-if="data.length > 0" v-for="(row, index) in data" :key="index">
          <td v-for="header in headers" :key="header" :data-label="header">
            <template v-if="header === '最後存取時間'">
              <span v-if="!row[header]">
                已過一年以上沒有使用
              </span>
              <span v-else>
                {{ new Date(row[header]).toLocaleString() }}
              </span>
            </template>
            <template v-else>
              {{ row[header] }}
            </template>
          </td>
          <td data-label="操作">
            <button class="btn btn-sm btn-outline-primary" @click="$emit('view-details', row)">
              <i class="bi bi-eye"></i> 查看詳情
            </button>
          </td>
        </tr>
        <tr v-else>
          <td :colspan="headers.length + 1" class="text-center">沒有找到符合搜尋條件的資料。</td>
        </tr>
      </tbody>
    </table>
  </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import SortIcon from './SortIcon.vue';

// --- Props --- 
// 定義此元件接收的所有屬性
defineProps({
  // 表格標頭陣列
  headers: { type: Array, required: true },
  // 要顯示的資料陣列 (已經過分頁處理)
  data: { type: Array, required: true },
  // 目前排序的欄位 key
  sortKey: { type: String, required: true },
  // 目前的排序順序 ('asc' 或 'desc')
  sortOrder: { type: String, required: true },
  // 包含所有搜尋條件的物件
  searchQueries: { type: Object, required: true },
  // 為特定欄位提供下拉選單選項的物件
  dropdownOptions: { type: Object, required: true }
});

// --- Emits ---
// 定義此元件會觸發的事件，以便父元件監聽
defineEmits([
  'sort',             // 當使用者點擊標頭進行排序時觸發
  'update:searchQueries', // 當任何搜尋條件改變時觸發
  'view-details'      // 當使用者點擊「查看詳情」按鈕時觸發
]);

// --- State ---
// 控制在手機版上是否顯示篩選條件區域
const isFilterVisible = ref(false);
</script>

<style scoped>
th {
  user-select: none;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
}

.actions-header {
  width: 1%; /* 讓操作欄位寬度盡可能小 */
}

.rwd-table th, .rwd-table td {
  white-space: nowrap;
}

.filter-row th {
  padding: 0.5rem;
}

/* RWD (響應式網頁設計) 樣式 */
/* 當螢幕寬度小於 768px 時生效 */
@media (max-width: 767.98px) {
  /* 隱藏傳統的 a-zA-Z0-9 標題列，但保留 thead 元素以便顯示篩選列 */
  .rwd-table > thead > tr:not(.filter-row) {
    display: none;
  }

  /* 在手機版，預設隱藏篩選條件區塊 */
  .rwd-table .filter-row {
    display: none;
    border-bottom: 1px solid #495057; /* 為篩選區塊加上底線 */
  }

  /* 將表格的每一行 (tr) 變成一個區塊元素，類似卡片 */
  .rwd-table tr {
    display: block;
    margin-bottom: 1rem;
    border: 1px solid #dee2e6;
    border-radius: .25rem;
  }

  /* 當點擊「顯示篩選條件」按鈕後，讓篩選區塊顯示出來 */
  .filters-mobile-open .rwd-table .filter-row {
    display: block;
  }

  /* 讓篩選區塊中的每個儲存格 (th) 垂直堆疊 */
  .rwd-table .filter-row th {
    display: block;
  }
  
  /* 將每一個資料格 (td) 也變成區塊元素，並設定其樣式 */
  .rwd-table td {
    display: block;
    text-align: right; /* 讓內容靠右對齊 */
    border: none;
    border-bottom: 1px solid #dee2e6;
    position: relative;
    padding-left: 50%; /* 留出左邊空間給偽元素標籤 */
    white-space: normal; /* 恢復自動換行 */
  }

  .rwd-table td:last-child {
    border-bottom: 0; /* 最後一個資料格不需要底線 */
  }

  /* 使用偽元素 (::before) 來顯示該行的標題 */
  .rwd-table td::before {
    content: attr(data-label); /* 讀取 td 上的 data-label 屬性作為內容 */
    position: absolute;
    left: 0;
    width: 45%;
    padding-left: 1rem;
    font-weight: bold;
    text-align: left;
  }
}
</style>
