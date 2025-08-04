<template>
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
</template>

<script setup>
import SortIcon from './SortIcon.vue';

defineProps({
  headers: {
    type: Array,
    required: true
  },
  data: {
    type: Array,
    required: true
  },
  sortKey: {
    type: String,
    required: true
  },
  sortOrder: {
    type: String,
    required: true
  },
  searchQueries: {
    type: Object,
    required: true
  },
  dropdownOptions: {
    type: Object,
    required: true
  }
});

defineEmits(['sort', 'update:searchQueries', 'view-details']);
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

/* RWD Table Styles */
@media (max-width: 767.98px) {
  .rwd-table thead {
    display: none;
  }

  .rwd-table tr {
    display: block;
    margin-bottom: 1rem;
    border: 1px solid #dee2e6;
    border-radius: .25rem;
  }
  
  .rwd-table td {
    display: block;
    text-align: right;
    border: none;
    border-bottom: 1px solid #dee2e6;
    position: relative;
    padding-left: 50%;
    white-space: normal; /* 在手機視圖中恢復自動換行 */
  }

  .rwd-table td:last-child {
    border-bottom: 0;
  }

  .rwd-table td::before {
    content: attr(data-label);
    position: absolute;
    left: 0;
    width: 45%;
    padding-left: 1rem;
    font-weight: bold;
    text-align: left;
  }
}
</style>
