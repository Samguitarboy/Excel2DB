<template>
  <!-- Mobile filter toggle -->
  <div class="d-grid d-md-none mb-2">
    <button class="btn btn-outline-secondary btn-sm" type="button" @click="showFilters = !showFilters">
      <i class="bi bi-funnel-fill"></i>
      {{ showFilters ? '隱藏篩選條件' : '顯示篩選條件' }}
    </button>
  </div>

  <div :class="{ 'filters-mobile-open': showFilters }">
    <div class="table-responsive">
      <table class="table table-striped table-hover rwd-table">
        <thead class="table-dark">
          <tr>
            <th v-for="header in headers" :key="header" @click="emitSort(header)" class="sortable-header">
              {{ header }}
              <SortIcon :active="sortKey === header" :sort-order="sortOrder" />
            </th>
            <th class="actions-header"></th>
          </tr>
          <tr class="filter-row">
            <th v-for="header in headers" :key="`${header}-filter`">
              <!-- 下拉式選單篩選 -->
              <div v-if="header === '最後存取時間'" class="d-flex align-items-center" style="min-width: 220px;">
                <select class="form-select form-select-sm" style="width: auto;" :value="searchQueries[header].operator" @change="updateSearchQueries(header, { ...searchQueries[header], operator: $event.target.value })">
                  <option value="gt">晚於</option>
                  <option value="lt">早於</option>
                </select>
                <input type="date" class="form-control form-control-sm ms-1" :value="searchQueries[header].value" @input="updateSearchQueries(header, { ...searchQueries[header], value: $event.target.value })">
              </div>
              <select v-else-if="dropdownOptions[header]" class="form-select form-select-sm" :value="searchQueries[header]" @change="updateSearchQueries(header, $event.target.value)">
                  <option value="">所有</option>
                  <option v-for="option in dropdownOptions[header]" :key="option" :value="option">{{ option }}</option>
              </select>
              <!-- 日期區間篩選 -->
              <!-- 一般文字篩選 -->
              <input v-else type="text" class="form-control form-control-sm" :placeholder="`搜尋 ${header}`" :value="searchQueries[header]" @input="updateSearchQueries(header, $event.target.value)">
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <template v-if="data.length > 0">
            <tr v-for="(row, index) in data" :key="index">
              <td v-for="header in headers" :key="header" :data-label="header">
                <template v-if="header === '最後存取時間'">
                  <span v-if="row[header]">{{ new Date(row[header]).toLocaleString() }}</span>
                  <span v-else> 已過一年以上沒有使用 </span>
                </template>
                <template v-else>
                  {{ row[header] }}
                </template>
              </td>
              <td data-label="操作">
                <button class="btn btn-sm btn-outline-primary" @click="emitViewDetails(row)">
                  <i class="bi bi-eye"></i> 查看詳情
                </button>
              </td>
            </tr>
          </template>
          <tr v-else>
            <td :colspan="headers.length + 1" class="text-center">
              沒有找到符合搜尋條件的資料。
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import SortIcon from './SortIcon.vue';

const props = defineProps({
  headers: { type: Array, required: true },
  data: { type: Array, required: true },
  sortKey: { type: String, required: true },
  sortOrder: { type: String, required: true },
  searchQueries: { type: Object, required: true },
  dropdownOptions: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['sort', 'update:searchQueries', 'view-details']);

const showFilters = ref(false);

const emitSort = (key) => {
  emit('sort', key);
};

const updateSearchQueries = (header, value) => {
  emit('update:searchQueries', {
    ...props.searchQueries,
    [header]: value
  });
};

const emitViewDetails = (row) => {
  emit('view-details', row);
};


</script>

<style scoped>
.rwd-table {
  /* 自動表格佈局，讓欄寬根據內容調整 */
  table-layout: auto;
  width: 100%;
}

.sortable-header {
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}

.actions-header {
  width: 1%;
  white-space: nowrap;
}

/* 確保操作欄位在桌面版不會換行 */
td[data-label="操作"] {
  white-space: nowrap;
}

.filter-row th {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

@media (max-width: 767.98px) {
  .filters-mobile-open .filter-row {
    display: table-row;
  }
  .filter-row {
    display: none;
  }
  .rwd-table thead {
    display: none;
  }
  .rwd-table tr {
    display: block;
    margin-bottom: 1rem;
    border: 1px solid #dee2e6;
    border-radius: .375rem;
    box-shadow: 0 1px 3px rgba(0,0,0,.05);
  }
  .rwd-table td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: right;
    padding: .75rem;
    border-bottom: 1px solid #e9ecef;
  }
  .rwd-table td:not([data-label="操作"]):before {
    content: attr(data-label);
    font-weight: bold;
    text-align: left;
    padding-right: 1rem;
  }
  .rwd-table td:last-child {
    border-bottom: 0;
  }
  .rwd-table td[data-label="操作"] {
    /* 改為區塊級元素，讓按鈕能穩定地佔滿寬度 */
    display: block;
    white-space: normal; /* 在行動裝置上允許按鈕文字換行 */
  }
  .rwd-table td[data-label="操作"] button {
    width: 100%;
  }
}
</style>
