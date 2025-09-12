<template>
  <div class="container mt-5">
    <!-- Loading Overlay -->
    <LoadingOverlay v-if="loading" :message="loadingMessage" />

    <div v-if="!loading" class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h2>我的申請紀錄</h2>
        <router-link to="/" class="btn btn-secondary">返回列表</router-link>
      </div>
      <div class="card-body">
        <!-- Status Filter -->
        <div class="row mb-3">
          <div class="col-md-4">
            <label for="statusFilter" class="form-label">篩選申請狀態</label>
            <select id="statusFilter" class="form-select" v-model="selectedStatus">
              <option v-for="(label, value) in statusOptions" :key="value" :value="value">
                {{ label }}
              </option>
            </select>
          </div>
        </div>
        
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-else-if="filteredApplications.length > 0" class="table-responsive">
          <table class="table table-striped table-hover table-bordered align-middle">
            <thead class="table-light">
              <tr>
                <th>所屬單位</th>
                <th>組別/股別</th>
                <th>保管人</th>
                <th>單位管控窗口</th>
                <th>申請狀態</th>
                <th style="width: 500px;">申請原因</th>
                <th @click="sortBy('updatedAt')" class="sortable-header">
                  最後更新時間
                  <i v-if="sortKey === 'updatedAt'" class="bi" :class="sortOrder === 'asc' ? 'bi-sort-up' : 'bi-sort-down'"></i>
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <!-- NEW LOGIC: Group by subUnit -->
            <tbody v-for="groupData in finalGroupedApplications" :key="groupData.key">
              <tr v-for="(app, index) in groupData.apps" :key="app.id">
                <!-- Affiliated Unit: Show only on the first row of the group -->
                <td v-if="index === 0" :rowspan="groupData.apps.length">{{ app.affiliatedUnit }}</td>
                
                <!-- Sub Unit: Show only on the first row of the group -->
                <td v-if="index === 0" :rowspan="groupData.apps.length">{{ app.subUnit }}</td>

                <!-- Custodian: Show for every row -->
                <td>{{ app.custodian }}</td>

                <!-- Unit Control Contact: Show only on the first row of the group -->
                <td v-if="index === 0" :rowspan="groupData.apps.length">{{ app.unitControlContact }}</td>

                <!-- Status: Show for every row -->
                <td>
                  <span :class="statusClass(app.status)">{{ translateStatus(app.status) }}</span>
                </td>
                
                <!-- Reason: Show only on the first row of the group -->
                <td v-if="index === 0" :rowspan="groupData.apps.length">{{ groupData.apps[0].reason || '該單位僅申請一支隨身碟' }}</td>
                
                <!-- Last Updated: Show only on the first row of the group -->
                <td v-if="index === 0" :rowspan="groupData.apps.length">
                  {{ formatDateTime(app.updatedAt) }}
                </td>

                <!-- Actions: Complex rowspan logic handled by isFirstInSubmission -->
                <td v-if="app.isFirstInSubmission" :rowspan="app.submissionRowspan">
                  <div class="d-flex">
                    <button
                      v-if="app.status === 'pending'"
                      class="btn btn-sm btn-primary"
                      @click="withdrawApplication(app)"
                      :disabled="updating"
                    >
                      撤回申請
                    </button>
                    <button
                      v-if="app.status === 'approved'"
                      class="btn btn-sm btn-success"
                      @click="downloadOrRegeneratePdf(app)"
                      :disabled="downloading[app.id]"
                    >
                      <span v-if="downloading[app.id]" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <i v-else class="bi bi-file-earmark-pdf-fill me-1"></i>
                      {{ downloading[app.id] ? '處理中...' : '下載PDF' }}
                    </button>
                    <button
                      v-if="app.status === 'approved'"
                      class="btn btn-sm btn-info ms-2"
                      @click="openUsageNotesModal('/pdfs/notice1.pdf')"
                    >
                      <i class="bi bi-info-circle-fill me-1"></i>
                      使用注意事項
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else-if="pollingFailed" class="alert alert-warning">
          系統在多次嘗試後仍無法更新您剛才提出的申請，它可能仍在處理中。<br>
          請稍後再自行刷新頁面，或聯繫資訊室。
        </div>
        <div v-else class="alert alert-info">
          {{ selectedStatus ? '沒有符合條件的申請紀錄。' : '目前沒有申請紀錄。' }}
        </div>
      </div>
    </div>
    <Toast 
      :show="toast.show" 
      :message="toast.message" 
      :type="toast.type" 
      @update:show="toast.show = $event" 
    />
    <UsageNotesModal 
      v-if="showUsageNotesModal"
      :pdf-path="usageNotesPdfPath"
      @close="showUsageNotesModal = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useGuestStore } from '../stores/guest';
import { fetchMyApplications, userWithdrawApplication, downloadApplicationPdf, regenerateApplicationPdf } from '../services/api';
import Toast from '../components/Toast.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import UsageNotesModal from '../components/UsageNotesModal.vue';

const POLLING_CONFIG = {
  RETRIES: 10,
  INTERVAL_MS: 6000,
};

const statusOptions = {
  '': '全部狀態',
  pending: '審核中',
  approved: '已核准',
  rejected: '已拒絕',
  withdrawn: '已撤回',
};

const STATUS_CLASSES = {
  pending: 'badge bg-warning text-dark',
  approved: 'badge bg-success',
  rejected: 'badge bg-danger',
  withdrawn: 'badge bg-secondary',
};

const guestStore = useGuestStore();
const myApplications = ref([]);
const selectedStatus = ref(''); // For filtering
const loading = ref(true);
const loadingMessage = ref('正在載入您的申請紀錄...');
const error = ref(null);
const updating = ref(false);
const downloading = ref({}); // 追蹤每個申請的下載狀態
const toast = ref({ show: false, message: '', type: 'info' });
const route = useRoute();
const sortKey = ref('updatedAt');
const sortOrder = ref('desc'); // 'asc' or 'desc'

const showUsageNotesModal = ref(false);
const usageNotesPdfPath = ref('');

const openUsageNotesModal = (pdfPath) => {
  usageNotesPdfPath.value = pdfPath;
  showUsageNotesModal.value = true;
};

const fetchData = async () => {
  try {
    myApplications.value = await fetchMyApplications(guestStore.guestMajorUnit);
  } catch (err) {
    error.value = '無法載入申請紀錄，請稍後再試。';
    console.error(err);
  }
};

const pollingFailed = ref(false);

const pollForNewApplications = async (initialCount) => {
  loadingMessage.value = '正在送出您的申請，處理時間約莫需一兩分鐘，請耐心等候...';
  for (let i = 0; i < POLLING_CONFIG.RETRIES; i++) {
    await new Promise(r => setTimeout(r, POLLING_CONFIG.INTERVAL_MS));
    await fetchData();
    console.log(`[MyApplications] 第${i+1}次重試取得申請紀錄`, myApplications.value);
    if (myApplications.value.length > initialCount) {
      pollingFailed.value = false;
      return; // 找到資料後即退出
    }
  }
  pollingFailed.value = true;
  console.log('[MyApplications] 輪詢結束，仍未找到新申請。');
};

const initializeData = async () => {
  try {
    if (!guestStore.isGuestMode || !guestStore.guestMajorUnit) {
      error.value = '無法確定您的單位，請重新登入。';
      return;
    }

    await fetchData();
    console.log('[MyApplications] 首次取得申請紀錄', myApplications.value);

    const initialCount = myApplications.value.length;
    if (route.query.submitted === 'true') {
      await pollForNewApplications(initialCount);
    }
  } catch (err) {
    error.value = err.message || '資料初始化失敗。';
    console.error(err);
  } finally {
    loading.value = false;
    console.log('[MyApplications] 資料載入完成');
  }
};

onMounted(initializeData);

const filteredApplications = computed(() => {
  let apps = myApplications.value;

  // 1. Filter
  if (selectedStatus.value) {
    apps = apps.filter(app => app.status === selectedStatus.value);
  }

  // 2. Sort (create a shallow copy to avoid mutating the original array)
  return apps.slice().sort((a, b) => {
    let valA = a[sortKey.value];
    let valB = b[sortKey.value];

    if (sortKey.value === 'updatedAt') {
      valA = new Date(valA);
      valB = new Date(valB);
    }

    const comparison = valA < valB ? -1 : (valA > valB ? 1 : 0);
    return sortOrder.value === 'desc' ? -comparison : comparison;
  });
});

// NEW LOGIC: Group by subUnit first
const applicationsBySubUnit = computed(() => {
  if (!filteredApplications.value) return [];
  const grouped = filteredApplications.value.reduce((acc, app) => {
    // Use a composite key to ensure uniqueness across different main units
    const key = `${app.affiliatedUnit}-${app.subUnit || '未知'}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(app);
    return acc;
  }, {});
  return Object.values(grouped);
});

const finalGroupedApplications = computed(() => {
  return applicationsBySubUnit.value.map(group => {
    const firstApp = group[0];

    // This logic is for the action buttons, which needs to be preserved.
    // It now operates on the subUnit group, which is correct.
    const processedApps = group.map((app, index, originalGroup) => {
      let isFirst = false;
      let rowspan = 1;

      if (app.status === 'approved') {
        const firstIndexInGroup = originalGroup.findIndex(a => a.status === 'approved' && a.custodian === app.custodian);
        isFirst = index === firstIndexInGroup;
        if (isFirst) {
          rowspan = originalGroup.filter(a => a.status === 'approved' && a.custodian === app.custodian).length;
        }
      } else if (app.status === 'pending' && app.submissionId) {
        const firstIndexInGroup = originalGroup.findIndex(a => a.status === 'pending' && a.submissionId === app.submissionId);
        isFirst = index === firstIndexInGroup;
        if (isFirst) {
          rowspan = originalGroup.filter(a => a.status === 'pending' && a.submissionId === app.submissionId).length;
        }
      } else {
        isFirst = true;
        rowspan = 1;
      }

      return {
        ...app,
        isFirstInSubmission: isFirst,
        submissionRowspan: rowspan,
      };
    });

    return {
      apps: processedApps,
      key: firstApp.id
    };
  });
});

const translateStatus = (status) => {
  return statusOptions[status] || status;
};

const statusClass = (status) => {
  return STATUS_CLASSES[status] || 'badge bg-secondary';
};

const sortBy = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'desc'; // Default to descending when changing column
  }
};

const formatDateTime = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch (e) {
    return '無效日期';
  }
};

const withdrawApplication = async (app) => {
  const batchApplications = app.submissionId
    ? myApplications.value.filter(
        (a) => a.submissionId === app.submissionId && a.status === 'pending'
      )
    : [app];

  const isBatchWithdrawal = batchApplications.length > 1;
  let confirmMessage = '您確定要撤回此筆申請嗎？';

  if (isBatchWithdrawal) {
    confirmMessage = `此為批次申請 (共 ${batchApplications.length} 筆待審核)，撤回此申請將會一併撤回所有相關申請。您確定要全部撤回嗎？`;
  }

  if (!confirm(confirmMessage)) return;

  updating.value = true;
  try {
    await userWithdrawApplication(app.id);

    // 輪詢檢查狀態是否更新
    for (let i = 0; i < POLLING_CONFIG.RETRIES; i++) {
      await new Promise(r => setTimeout(r, POLLING_CONFIG.INTERVAL_MS));
      await fetchData();
      console.log(`[MyApplications] 第${i+1}次重試取得已撤回紀錄`);

      const freshApp = myApplications.value.find(a => a.id === app.id);

      if (freshApp && freshApp.status === 'withdrawn') {
        console.log('[MyApplications] 偵測到狀態已更新，提前結束輪詢。');
        break; 
      }
    }

    const successMessage = isBatchWithdrawal
      ? `共 ${batchApplications.length} 筆相關申請已成功撤回。`
      : '申請已成功撤回。';
    showToast(successMessage, 'success');

  } catch (err) {
    showToast(err.message || '無法撤回申請，請稍後再試。', 'danger');
    console.error(err);
  } finally {
    updating.value = false;
  }
};

const showToast = (message, type = 'info') => {
  toast.value.message = message;
  toast.value.type = type;
  toast.value.show = false;
  nextTick(() => {
    toast.value.show = true;
  });
};

const triggerPdfDownload = (blobData, filename) => {
  const url = window.URL.createObjectURL(new Blob([blobData]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const parseApiError = async (error) => {
  if (!error.response || !error.response.data) {
    return { message: error.message || '未知錯誤' };
  }
  try {
    if (error.response.data instanceof Blob) {
      const errorText = await error.response.data.text();
      return JSON.parse(errorText);
    }
    return error.response.data;
  } catch (e) {
    return { message: '無法解析錯誤回應。' };
  }
};

const regenerateAndDownload = async (appId, filename) => {
  try {
    const regenResponse = await regenerateApplicationPdf(appId);
    showToast(regenResponse.message || 'PDF 已成功重新產生，正在為您下載...', 'success');
    const retryResponse = await downloadApplicationPdf(appId);
    triggerPdfDownload(retryResponse.data, filename);
  } catch (regenError) {
    const errorData = await parseApiError(regenError);
    showToast(`重新產生或下載失敗: ${errorData.message || '未知錯誤'}`, 'danger');
  }
};

const downloadOrRegeneratePdf = async (app) => {
  downloading.value[app.id] = true;
  const filename = `可攜式儲存媒體申請單_${app.affiliatedUnit}_${app.custodian}.pdf`;

  try {
    const response = await downloadApplicationPdf(app.id);
    triggerPdfDownload(response.data, filename);
  } catch (err) {
    const errorData = await parseApiError(err);
    if (err.response?.status === 404 && errorData.code === 'PDF_NOT_FOUND') {
      // For regular users, just show an error message. Do not offer to regenerate.
      showToast('PDF檔案不存在或尚未產生，請聯繫資訊室。', 'warning');
    } else {
      showToast(`下載失敗: ${errorData.message || '未知錯誤'}`, 'danger');
    }
  } finally {
    downloading.value[app.id] = false;
  }
};
</script>

<style scoped>
.container {
  max-width: 83%;
}
.card {
  box-shadow: 0 4px 8px rgba(0,0,0,.05);
  border-radius: .5rem;
}
.badge {
  font-size: 0.9em;
}
.table-responsive {
  overflow-x: auto;
}
.sortable-header {
  cursor: pointer;
  user-select: none; /* Prevent text selection on click */
}
.sortable-header:hover {
  background-color: #f8f9fa; /* A light hover effect consistent with Bootstrap tables */
}
</style>