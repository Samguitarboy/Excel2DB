<template>
  <div class="container mt-5">
    <HistoryModal
      :show="isHistoryModalVisible"
      :history="selectedAssetHistory"
      :media-name="currentMediaNameForHistory"
      @close="closeHistoryModal"
    />
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h2 class="mb-0">可攜式儲存媒體借用與歸還</h2>
          <p v-if="guestStore.isGuestMode" class="text-muted mb-0">單位: {{ guestStore.guestMajorUnit }}</p>
        </div>
        <button class="btn btn-secondary" @click="goBack">返回列表頁</button>
      </div>
      <div class="card-body">
        <!-- 1. 媒體清單 -->
        <h4 class="mb-3">步驟一：請先選擇欲借用或歸還的可攜式儲存設備</h4>
        <div v-if="loading" class="text-center my-5">
          <LoadingSpinner />
          <p class="mt-2">正在載入媒體清單...</p>
        </div>
        <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-else-if="mediaList.length > 0">
          <div class="table-responsive">
            <table class="table table-hover align-middle">
              <thead class="table-light">
                <tr>
                  <th style="width: 5%;">選取</th>
                  <th>可攜式儲存媒體名稱</th>
                  <th>保管人</th>
                  <th>狀態</th>
                  <th>目前的借用人</th>
                  <th>預計歸還日期</th>
                  <th style="width: 10%;" class="text-center">借用歷程記錄</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in paginatedMediaList" :key="item['財產編號']" @click="selectItem(item)" :class="{ 'table-primary': selectedItem && selectedItem['財產編號'] === item['財產編號'] }" style="cursor: pointer;">
                  <td class="text-center">
                    <input 
                      class="form-check-input" 
                      type="radio"
                      :id="`item-${item['財產編號']}`"
                      :value="item['財產編號']"
                      :checked="selectedItem && selectedItem['財產編號'] === item['財產編號']"
                    >
                  </td>
                  <td>{{ item['資產名稱'] }}</td>
                  <td>{{ item['保管人'] }}</td>
                  <td>
                    <span class="badge" :class="statusClass(item.displayStatus)">{{ item.displayStatus }}</span>
                  </td>
                  <td>{{ item.loanInfo ? item.loanInfo.borrower : '--' }}</td>
                  <td>{{ item.loanInfo ? new Date(item.loanInfo.expectedReturnDate).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/') : '--' }}</td> <!-- 新增欄位 -->
                  <td class="text-center">
                    <button class="btn btn-sm btn-outline-secondary" @click.stop="showHistory(item)">
                      查看
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Pagination
            :total-items="mediaList.length"
            :current-page="currentPage"
            :total-pages="totalPages"
            :items-per-page="itemsPerPage"
            @change-page="changePage"
            :show-items-per-page="false"
            :show-jump-to-page="false"
            justify-content="justify-content-center"
          />
        </div>
        <div v-else class="alert alert-info">目前該單位無資料，或沒有可供借用的儲存媒體。</div>

        <!-- 2. 動態操作區 -->
        <div v-if="selectedItem" class="mt-5 pt-4 border-top">
          <!-- 借用表單 -->
          <div v-if="selectedItem.displayStatus === '可借用'">
            <h4 class="mb-3">步驟二：填寫借用資訊</h4>
            <div class="row g-3">
              <div class="col-md-4">
                <label for="borrowerName" class="form-label">借用人</label>
                <input type="text" id="borrowerName" class="form-control" v-model="borrowerName">
              </div>
              <div class="col-md-4">
                <label for="returnDate" class="form-label">預計歸還日期</label>
                <input type="date" id="returnDate" class="form-control" v-model="returnDate">
              </div>
              <div class="col-12">
                <label for="reason" class="form-label">借用事由</label>
                <textarea id="reason" class="form-control" rows="3" v-model="reason"></textarea>
              </div>
              <div class="col-12 text-end">
                <button class="btn btn-primary btn-lg" @click="handleBorrow" :disabled="isSubmitting">
                  <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                  {{ isSubmitting ? '提交中...' : '確認借用' }}
                </button>
              </div>
            </div>
          </div>
          <!-- 歸還介面 -->
          <div v-else-if="selectedItem.displayStatus === '已借出'">
            <h4 class="mb-3">步驟二：確認歸還資訊</h4>
            <div class="alert alert-warning">
              <p class="mb-1"><strong>可攜式儲存媒體名稱：</strong> {{ selectedItem['資產名稱'] }}</p>
              <p class="mb-1"><strong>借用人：</strong> {{ selectedItem.loanInfo.borrower }}</p>
              <p class="mb-1"><strong>借用日期：</strong> {{ new Date(selectedItem.loanInfo.loanDate).toLocaleDateString() }}</p>
              <p class="mb-0"><strong>預計歸還日期：</strong> {{ selectedItem.loanInfo ? new Date(selectedItem.loanInfo.expectedReturnDate).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/') : '--' }}</p>
            </div>
            <div class="text-end mt-3">
              <button class="btn btn-danger btn-lg" @click="handleReturn" :disabled="isSubmitting">
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                 {{ isSubmitting ? '處理中...' : '確認歸還此項目' }}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useGuestStore } from '../stores/guest';
import { fetchPublicDataByUnits, fetchLoans, submitLoan, returnLoan, getLoanHistoryByAsset } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import Pagination from '../components/Pagination.vue';
import HistoryModal from '../components/HistoryModal.vue';

const router = useRouter();
const guestStore = useGuestStore();

// --- 狀態管理 ---
const mediaList = ref([]);
const loading = ref(true);
const error = ref(null);
const selectedItem = ref(null);
const isSubmitting = ref(false);

// --- 分頁狀態 ---
const currentPage = ref(1);
const itemsPerPage = ref(5);

// --- 表單數據 ---
const borrowerName = ref('');
const returnDate = ref('');
const reason = ref('');

// --- Modal 狀態 ---
const isHistoryModalVisible = ref(false);
const selectedAssetHistory = ref([]);
const currentMediaNameForHistory = ref(''); // 新增

// --- 常數 ---
const PORTABLE_MEDIA_TYPES = ['隨身碟', '加密隨身碟', '行動硬碟','錄音筆','數位相機'];

// --- 計算屬性 ---
const totalPages = computed(() => Math.ceil(mediaList.value.length / itemsPerPage.value));

const paginatedMediaList = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return mediaList.value.slice(start, end);
});

// --- 資料讀取方法 ---
const loadData = async () => {
  loading.value = true;
  error.value = null;
  try {
    if (!guestStore.isGuestMode || guestStore.guestSubUnits.length === 0) {
      throw new Error('無法確定您的單位，請先以訪客模式登入並選擇單位。');
    }

    const [allAssets, allLoans] = await Promise.all([
      fetchPublicDataByUnits(guestStore.guestSubUnits),
      fetchLoans()
    ]);

    const activeLoanMap = new Map(
      allLoans
        .filter(loan => loan.status === 'borrowed') // Updated from 'active' to 'borrowed'
        .map(loan => [loan.mediaPropertyNumber, loan])
    );

    mediaList.value = allAssets
      .filter(item => PORTABLE_MEDIA_TYPES.includes(item['(自)分類']))
      .map(item => {
        const loanInfo = activeLoanMap.get(item['財產編號']);
        const displayStatus = loanInfo ? '已借出' : '可借用';
        return { ...item, displayStatus, loanInfo };
      })
      .sort((a, b) => { // 新增排序
        const nameA = a['資產名稱'] || '';
        const nameB = b['資產名稱'] || '';
        return nameA.localeCompare(nameB, 'zh-TW'); // 依中文名稱排序
      });

  } catch (err) {
    error.value = `無法載入資料：${err.message}`;
  } finally {
    loading.value = false;
  }
};

// --- 生命週期鉤子 ---
onMounted(loadData);

// --- UI 方法 ---
const selectItem = (item) => {
  if (selectedItem.value && selectedItem.value['財產編號'] === item['財產編號']) {
    selectedItem.value = null;
  } else {
    selectedItem.value = item;
  }
};

const goBack = () => {
  router.back();
};

const statusClass = (status) => {
  return status === '可借用' ? 'bg-success' : 'bg-warning text-dark';
};

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    selectedItem.value = null; // 換頁時清空選取
  }
};

// --- Modal 方法 ---
const showHistory = async (item) => {
  try {
    const history = await getLoanHistoryByAsset(item['財產編號']);
    selectedAssetHistory.value = history;
    currentMediaNameForHistory.value = item['資產名稱']; // 設定媒體名稱
    isHistoryModalVisible.value = true;
  } catch (err) {
    alert(`無法載入歷史記錄：${err.message}`);
  }
};

const closeHistoryModal = () => {
  isHistoryModalVisible.value = false;
};

// --- 操作方法 ---
const handleBorrow = async () => {
  if (!borrowerName.value || !returnDate.value || !reason.value) {
    alert('請填寫所有借用資訊欄位！');
    return;
  }
  
  isSubmitting.value = true;
  try {
    const loanData = {
      borrower: borrowerName.value,
      expectedReturnDate: returnDate.value,
      reason: reason.value,
      mediaPropertyNumbers: [selectedItem.value['財產編號']],
      unit: guestStore.guestMajorUnit,
    };

    const response = await submitLoan(loanData);
    alert(response.message || '借用申請已成功紀錄！');

    selectedItem.value = null;
    borrowerName.value = '';
    returnDate.value = '';
    reason.value = '';
    await loadData();

  } catch (err) {
    alert(`提交失敗：${err.message}`);
  } finally {
    isSubmitting.value = false;
  }
};

const handleReturn = async () => {
  if (!selectedItem.value || !selectedItem.value.loanInfo) return;

  if (!confirm(`您確定要歸還「${selectedItem.value['資產名稱']}」嗎？`)) {
    return;
  }

  isSubmitting.value = true;
  try {
    const loanId = selectedItem.value.loanInfo.loanId;
    const response = await returnLoan(loanId);
    alert(response.message || '歸還成功！');

    selectedItem.value = null;
    await loadData();

  } catch (err) {
    alert(`歸還失敗：${err.message}`);
  } finally {
    isSubmitting.value = false;
  }
};

</script>

<style scoped>
.card { box-shadow: 0 4px 8px rgba(0,0,0,.05); }
.badge { font-size: 0.9em; }
.table-primary { --bs-table-bg-state: #cfe2ff; }
</style>