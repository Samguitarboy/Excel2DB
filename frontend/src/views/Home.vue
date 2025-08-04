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
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { fetchExcelData } from '../services/api.js';
import DataTable from '../components/DataTable.vue';
import Pagination from '../components/Pagination.vue';
import DetailsModal from '../components/DetailsModal.vue';
import Toast from '../components/Toast.vue';

const excelData = ref([]);
const loading = ref(true);
const error = ref(null);
const columnSearchQueries = ref({});
const sortKey = ref('');
const sortOrder = ref('asc');
const currentPage = ref(1);
const itemsPerPage = ref(10);
const jumpPage = ref(1);
const isModalVisible = ref(false);
const selectedRow = ref(null);
const toast = ref({
  show: false,
  message: '',
  type: 'danger'
});

const router = useRouter();
const { logout } = useAuth();

const handleLogout = () => {
  logout();
  router.push('/login');
};

onMounted(async () => {
  try {
    excelData.value = await fetchExcelData();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});

const tableHeaders = computed(() => {
  if (excelData.value && excelData.value.length > 0) {
    const allHeaders = Object.keys(excelData.value[0]);
    const hiddenColumns = ['財產編號','(自)單位管控窗口', '(自)狀態'];
    return allHeaders.filter(header => !hiddenColumns.includes(header));
  }
  return [];
});

watch(tableHeaders, (newHeaders) => {
  const initialQueries = {};
  newHeaders.forEach(header => {
    if (header === '最後存取時間') {
      initialQueries[header] = { operator: 'gt', value: '' };
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
  const columnsForDropdown = ['(自)分類', '(自)狀態', '(自)所屬單位'];
  columnsForDropdown.forEach(header => {
    if (Object.keys(excelData.value[0] || {}).includes(header)) {
      const values = excelData.value.map(row => row[header]).filter(val => val);
      options[header] = [...new Set(values)].sort();
    }
  });
  return options;
});

const filteredData = computed(() => {
  return excelData.value.filter(row => {
    return Object.keys(columnSearchQueries.value).every(header => {
      const query = columnSearchQueries.value[header];
      const cellValue = row[header];
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
      if (typeof query === 'string' && query) {
        return String(cellValue).toLowerCase().includes(query.toLowerCase());
      }
      return true;
    });
  });
});

const sortedData = computed(() => {
  if (!sortKey.value) return filteredData.value;
  const sorted = [...filteredData.value];
  return sorted.sort((a, b) => {
    const valA = a[sortKey.value];
    const valB = b[sortKey.value];
    if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });
});

const totalPages = computed(() => Math.ceil(sortedData.value.length / itemsPerPage.value));

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return sortedData.value.slice(start, end);
});

watch(columnSearchQueries, () => { currentPage.value = 1; }, { deep: true });
watch(itemsPerPage, () => { currentPage.value = 1; });
watch(currentPage, (newPage) => { jumpPage.value = newPage; });

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
    showToast(`請輸入 1 到 ${totalPages.value} 之間的頁碼。`);
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
  selectedRow.value = null;
}

function showToast(message, type = 'danger') {
  toast.value.message = message;
  toast.value.type = type;
  toast.value.show = false;
  nextTick(() => {
    toast.value.show = true;
  });
}
</script>