<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h1>CEPP-可攜式儲存媒體使用清單列表</h1>
          </div>
          <div class="card-body">
            <div v-if="loading" class="text-center">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">載入中...</span>
              </div>
              <p class="mt-2">正在載入資料...</p>
            </div>

            <div v-else-if="error" class="alert alert-danger" role="alert">
              <strong>錯誤：</strong> {{ error }}
            </div>

            <div v-else-if="excelData.length > 0">
              <DataTable
                :headers="tableHeaders"
                :data="paginatedData"
                :sort-key="sortKey"
                :sort-order="sortOrder"
                :search-queries="columnSearchQueries"
                :dropdown-options="dropdownOptions"
                @sort="sortBy"
                @update:searchQueries="updateSearchQueries"
                @view-details="showDetails"
              />
            </div>

            <div v-else class="alert alert-warning" role="alert">
              沒有資料可顯示。
            </div>
          </div>
          <Pagination
            v-if="excelData.length > 0"
            :total-items="sortedData.length"
            :current-page="currentPage"
            :total-pages="totalPages"
            :items-per-page="itemsPerPage"
            v-model:jumpPage="jumpPage"
            @update:itemsPerPage="updateItemsPerPage"
            @change-page="changePage"
            @go-to-page="goToPage"
          />
        </div>
      </div>
    </div>
    <DetailsModal
      :show="isModalVisible"
      :row-data="selectedRow"
      @close="closeModal"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { fetchExcelData } from './services/api.js'
import DataTable from './components/DataTable.vue'
import Pagination from './components/Pagination.vue'
import DetailsModal from './components/DetailsModal.vue'

const excelData = ref([])
const loading = ref(true)
const error = ref(null)
const columnSearchQueries = ref({})
const sortKey = ref('')
const sortOrder = ref('asc')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const jumpPage = ref(1)
const isModalVisible = ref(false)
const selectedRow = ref(null)

onMounted(async () => {
  try {
    excelData.value = await fetchExcelData();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false
  }
})

const tableHeaders = computed(() => {
  if (excelData.value && excelData.value.length > 0) {
    const allHeaders = Object.keys(excelData.value[0]);
    // 定義要從主表格中隱藏的欄位
    const hiddenColumns = ['財產編號','(自)單位管控窗口', '(自)狀態'];
    return allHeaders.filter(header => !hiddenColumns.includes(header));
  }
  return [];
});

watch(tableHeaders, (newHeaders) => {
  const initialQueries = {};
  // 為所有可見的表頭初始化空的篩選條件
  newHeaders.forEach(header => {
    if (header === '最後存取時間') {
      initialQueries[header] = { operator: 'gt', value: '' }; // 恢復日期篩選器的結構
    } else {
      initialQueries[header] = '';
    }
  });
  columnSearchQueries.value = initialQueries;
});

const dropdownOptions = computed(() => {
  if (!excelData.value || excelData.value.length === 0) {
    return {};
  }

  const options = {};
  // 定義哪些欄位需要下拉選單
  const columnsForDropdown = ['(自)分類', '(自)狀態', '(自)所屬單位'];

  columnsForDropdown.forEach(header => {
    // 檢查所有可能的欄位，而不是只檢查可見的欄位
    if (Object.keys(excelData.value[0] || {}).includes(header)) {
      const values = excelData.value.map(row => row[header]).filter(val => val); // 提取所有值並過濾掉空值
      options[header] = [...new Set(values)].sort(); // 取得不重複且排序過的選項
    }
  });

  return options;
});

const filteredData = computed(() => {
  return excelData.value.filter(row => {
    // 遍歷所有篩選條件
    return Object.keys(columnSearchQueries.value).every(header => {
      const query = columnSearchQueries.value[header];
      const cellValue = row[header];

      // 恢復日期範圍篩選邏輯
      if (header === '最後存取時間' && typeof query === 'object' && query.value) {
        const queryDate = new Date(query.value);
        if (isNaN(queryDate.getTime())) return true; // 如果使用者輸入的日期無效，則不進行此項篩選

        // 如果是「早於」篩選，且儲存格為空，則視為符合條件 (已過期)
        if (query.operator === 'lt' && !cellValue) {
          return true;
        }
        // 對於其他情況，如果儲存格為空，則不符合
        if (!cellValue) return false;

        const cellDate = new Date(cellValue);
        if (isNaN(cellDate.getTime())) return false; // 如果儲存格日期無效，不匹配

        // 將日期標準化為當天零點進行比較，讓比較更精確
        cellDate.setHours(0, 0, 0, 0);
        queryDate.setHours(0, 0, 0, 0);

        return query.operator === 'gt' ? cellDate >= queryDate : cellDate <= queryDate;
      }
      // 處理一般文字或下拉選單篩選
      if (typeof query === 'string' && query) {
        return String(cellValue).toLowerCase().includes(query.toLowerCase());
      }
      return true; // 如果沒有篩選條件或篩選條件為空，則通過
    });
  });
});

const sortedData = computed(() => {
  if (!sortKey.value) {
    return filteredData.value;
  }
  const sorted = [...filteredData.value];
  return sorted.sort((a, b) => {
    const valA = a[sortKey.value];
    const valB = b[sortKey.value];
    if (valA < valB) {
      return sortOrder.value === 'asc' ? -1 : 1;
    }
    if (valA > valB) {
      return sortOrder.value === 'asc' ? 1 : -1;
    }
    return 0;
  });
});

const totalPages = computed(() => {
  return Math.ceil(sortedData.value.length / itemsPerPage.value);
});

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return sortedData.value.slice(start, end);
});

watch(columnSearchQueries, () => {
  currentPage.value = 1;
}, { deep: true });

watch(itemsPerPage, () => {
  currentPage.value = 1;
});

watch(currentPage, (newPage) => {
  jumpPage.value = newPage;
});

function sortBy(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
  currentPage.value = 1;
}

function changePage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

function goToPage() {
  const page = Number(jumpPage.value);
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  } else {
    alert(`請輸入 1 到 ${totalPages.value} 之間的頁碼。`);
    jumpPage.value = currentPage.value;
  }
}

function updateSearchQueries(queries) {
  columnSearchQueries.value = queries;
}

function updateItemsPerPage(value) {
  itemsPerPage.value = value;
}

function showDetails(row) {
  selectedRow.value = row;
  isModalVisible.value = true;
}

function closeModal() {
  isModalVisible.value = false;
  selectedRow.value = null; // 清除選中資料，是個好習慣
}
</script>

<style>
/* 全域樣式 */
body {
  background-color: #f8f9fa;
}
.card {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
</style>
