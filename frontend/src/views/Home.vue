<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h1>CEPP-可攜式儲存媒體使用清單列表</h1>
            <button class="btn btn-outline-danger" @click="handleLogout">登出</button>
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
    <Toast 
      :show="toast.show" 
      :message="toast.message" 
      :type="toast.type" 
      @update:show="toast.show = $event" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth';
import { fetchExcelData } from '../services/api.js';
import DataTable from '../components/DataTable.vue';
import Pagination from '../components/Pagination.vue';
import DetailsModal from '../components/DetailsModal.vue';
import Toast from '../components/Toast.vue';

// --- 狀態管理 (State) ---
const excelData = ref([]); // 儲存從後端獲取的原始資料
const loading = ref(true);   // 控制頁面初始載入狀態
const error = ref(null);     // 儲存資料獲取失敗的錯誤訊息

// --- 表格功能：排序、搜尋、分頁 ---
const sortKey = ref(''); // 目前排序的欄位
const sortOrder = ref('asc'); // 排序順序 (asc/desc)
const columnSearchQueries = ref({}); // 各欄位的搜尋條件
const currentPage = ref(1); // 目前頁碼
const itemsPerPage = ref(10); // 每頁顯示的項目數
const jumpPage = ref(1); // 分頁跳轉輸入框的綁定值

// --- UI 狀態 ---
const isModalVisible = ref(false); // 控制詳細資料彈窗的顯示
const selectedRow = ref(null);     // 儲存被選中要查看詳細資料的行
const toast = ref({ show: false, message: '', type: 'danger' }); // Toast 提示訊息的狀態

// --- 服務 (Services) ---
const authStore = useAuthStore();

// --- 生命週期鉤子 (Lifecycle Hook) ---
onMounted(async () => {
  try {
    // 元件掛載後，從後端獲取資料
    excelData.value = await fetchExcelData();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false; // 結束載入狀態
  }
});

// --- 計算屬性 (Computed Properties) ---

// 動態計算表格標頭，並過濾掉不需要顯示的欄位
const tableHeaders = computed(() => {
  if (!excelData.value || excelData.value.length === 0) return [];
  const allHeaders = Object.keys(excelData.value[0]);
  const hiddenColumns = ['財產編號', '(自)單位管控窗口', '(自)狀態'];
  return allHeaders.filter(header => !hiddenColumns.includes(header));
});

// 為需要下拉選單的欄位，從資料中提取唯一的選項
const dropdownOptions = computed(() => {
  if (!excelData.value || excelData.value.length === 0) return {};
  const options = {};
  const columnsForDropdown = ['(自)分類', '(自)狀態', '(自)所屬單位'];
  columnsForDropdown.forEach(header => {
    if (Object.keys(excelData.value[0] || {}).includes(header)) {
      const values = excelData.value.map(row => row[header]).filter(val => val);
      options[header] = [...new Set(values)].sort();
    }
  });
  return options;
});

// 根據搜尋條件過濾資料
const filteredData = computed(() => {
  return excelData.value.filter(row => {
    return Object.keys(columnSearchQueries.value).every(header => {
      const query = columnSearchQueries.value[header];
      const cellValue = row[header];
      // 特殊處理日期範圍搜尋
      if (header === '最後存取時間' && typeof query === 'object' && query.value) {
        const queryDate = new Date(query.value);
        if (isNaN(queryDate.getTime())) return true;
        if (query.operator === 'lt' && !cellValue) return true;
        if (!cellValue) return false;
        const cellDate = new Date(cellValue);
        if (isNaN(cellDate.getTime())) return false;
        cellDate.setHours(0, 0, 0, 0);
        queryDate.setHours(0, 0, 0, 0);
        return query.operator === 'gt' ? cellDate >= queryDate : cellDate <= queryDate;
      }
      // 處理一般文字搜尋
      if (typeof query === 'string' && query) {
        return String(cellValue).toLowerCase().includes(query.toLowerCase());
      }
      return true;
    });
  });
});

// 根據排序條件對已過濾的資料進行排序
const sortedData = computed(() => {
  if (!sortKey.value) return filteredData.value;
  return [...filteredData.value].sort((a, b) => {
    const valA = a[sortKey.value];
    const valB = b[sortKey.value];
    if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });
});

// 計算總頁數
const totalPages = computed(() => Math.ceil(sortedData.value.length / itemsPerPage.value));

// 根據目前頁碼和每頁顯示數量，從已排序的資料中擷取當前頁的資料
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return sortedData.value.slice(start, end);
});

// --- 監聽器 (Watchers) ---

// 當搜尋條件改變時，重設頁碼到第一頁
watch(columnSearchQueries, () => { currentPage.value = 1; }, { deep: true });
// 當每頁顯示數量改變時，重設頁碼到第一頁
watch(itemsPerPage, () => { currentPage.value = 1; });
// 當頁碼改變時，同步更新跳轉輸入框的值
watch(currentPage, (newPage) => { jumpPage.value = newPage; });
// 當表格標頭計算完成後，初始化搜尋條件物件
watch(tableHeaders, (newHeaders) => {
  const initialQueries = {};
  newHeaders.forEach(header => {
    initialQueries[header] = (header === '最後存取時間') ? { operator: 'gt', value: '' } : '';
  });
  columnSearchQueries.value = initialQueries;
});

// --- 方法 (Methods) ---

/** 處理登出 */
const handleLogout = () => {
  authStore.logout();
};

/**
 * 處理排序
 * @param {string} key - 要排序的欄位名
 */
function sortBy(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
  currentPage.value = 1; // 排序後回到第一頁
}

/**
 * 處理分頁切換
 * @param {number} page - 目標頁碼
 */
function changePage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

/** 處理分頁跳轉 */
function goToPage() {
  const page = Number(jumpPage.value);
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  } else {
    showToast(`請輸入 1 到 ${totalPages.value} 之間的頁碼。`);
    jumpPage.value = currentPage.value; // 還原輸入框的值
  }
}

/**
 * 更新搜尋條件 (由 DataTable 元件觸發)
 * @param {object} queries - 最新的搜尋條件物件
 */
function updateSearchQueries(queries) {
  columnSearchQueries.value = queries;
}

/**
 * 更新每頁顯示數量 (由 Pagination 元件觸發)
 * @param {number} value - 新的每頁顯示數量
 */
function updateItemsPerPage(value) {
  itemsPerPage.value = value;
}

/**
 * 顯示詳細資料彈窗
 * @param {object} row - 要顯示的行資料
 */
function showDetails(row) {
  selectedRow.value = row;
  isModalVisible.value = true;
}

/** 關閉詳細資料彈窗 */
function closeModal() {
  isModalVisible.value = false;
  selectedRow.value = null;
}

/**
 * 顯示 Toast 提示訊息
 * @param {string} message - 要顯示的訊息
 * @param {string} [type='danger'] - 提示類型 (例如: danger, success)
 */
function showToast(message, type = 'danger') {
  toast.value.message = message;
  toast.value.type = type;
  toast.value.show = false; // 先隱藏再顯示，確保動畫效果
  nextTick(() => {
    toast.value.show = true;
  });
}
</script>