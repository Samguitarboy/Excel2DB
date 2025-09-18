<template>
  <div class="container mt-5">
    <LoadingOverlay v-if="loading" :message="loadingMessage" />
    <div v-if="!loading" class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h2>我的申請紀錄</h2>
        <router-link to="/" class="btn btn-secondary">返回列表頁</router-link>
      </div>
      <div class="card-body">
        <p>
          <button class="btn btn-outline-info w-100" type="button" @click="isInstructionVisible = !isInstructionVisible">
            <i class="bi bi-chevron-down me-2 collapse-toggle-icon" :class="{ 'rotated': isInstructionVisible }"></i>
            {{ isInstructionVisible ? '隱藏' : '顯示' }} 後續申請步驟 (~20250919)
          </button>
        </p>
        <div class="collapse" :class="{ 'show': isInstructionVisible }">
          <InstructionCollapse />
        </div>

        <div class="row mb-3">
          <div class="col-md-4">
            <label for="statusFilter" class="form-label">篩選申請狀態</label>
            <select id="statusFilter" class="form-select" v-model="selectedStatus">
              <option v-for="(label, value) in statusOptions" :key="value" :value="value">{{ label }}</option>
            </select>
          </div>
        </div>
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-else-if="processedApplications.length > 0" class="table-responsive">
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
            <tbody>
              <tr v-for="app in processedApplications" :key="app.id">
                <td v-if="app.rowspan.affiliatedUnit > 0" :rowspan="app.rowspan.affiliatedUnit">{{ app.affiliatedUnit }}</td>
                <td v-if="app.rowspan.subUnit > 0" :rowspan="app.rowspan.subUnit">{{ app.subUnit }}</td>
                <td>{{ app.custodian }}</td>
                <td v-if="app.rowspan.unitControlContact > 0" :rowspan="app.rowspan.unitControlContact">{{ app.unitControlContact }}</td>
                <td><span :class="statusClass(app.status)">{{ translateStatus(app.status) }}</span></td>
                <td v-if="app.rowspan.reason > 0" :rowspan="app.rowspan.reason">{{ app.reason || '該單位僅申請一支隨身碟' }}</td>
                <td v-if="app.rowspan.updatedAt > 0" :rowspan="app.rowspan.updatedAt">{{ formatDateTime(app.updatedAt) }}</td>
                <td v-if="app.rowspan.actions > 0" :rowspan="app.rowspan.actions">
                  <div class="d-flex">
                    <button v-if="app.status === 'pending'" class="btn btn-sm btn-primary" @click="withdrawApplication(app)" :disabled="updating">撤回申請</button>
                    <button v-if="app.status === 'approved'" class="btn btn-sm btn-success" @click="downloadOrRegeneratePdf(app)" :disabled="downloading[app.id]">
                      <span v-if="downloading[app.id]" class="spinner-border spinner-border-sm"></span>
                      <i v-else class="bi bi-file-earmark-pdf-fill me-1"></i>
                      {{ downloading[app.id] ? '處理中...' : '下載PDF' }}
                    </button>
                    <button v-if="app.status === 'approved'" class="btn btn-sm btn-info ms-2" @click="openUsageNotesModal('pdfs/notice1.pdf')">
                      <i class="bi bi-info-circle-fill me-1"></i>
                      使用注意事項
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="alert alert-info">目前沒有申請紀錄。</div>
      </div>
    </div>
    <Toast :show="toast.show" :message="toast.message" :type="toast.type" @update:show="toast.show = $event" />
    <UsageNotesModal v-if="showUsageNotesModal" :pdf-path="usageNotesPdfPath" @close="showUsageNotesModal = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useGuestStore } from '../stores/guest';
import { fetchMyApplications, userWithdrawApplication, downloadApplicationPdf, regenerateApplicationPdf } from '../services/api';
import InstructionCollapse from '../components/InstructionCollapse.vue';
import Toast from '../components/Toast.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import UsageNotesModal from '../components/UsageNotesModal.vue';

const guestStore = useGuestStore();
const myApplications = ref([]);
const selectedStatus = ref('approved');
const loading = ref(true);
const loadingMessage = ref('正在載入您的申請紀錄...');
const error = ref(null);
const updating = ref(false);
const downloading = ref({});
const toast = ref({ show: false, message: '', type: 'info' });
const route = useRoute();
const sortKey = ref('updatedAt');
const sortOrder = ref('desc');
const showUsageNotesModal = ref(false);
const usageNotesPdfPath = ref('');
const isInstructionVisible = ref(false);

const statusOptions = { '': '全部狀態', pending: '審核中', approved: '已核准', rejected: '已拒絕', withdrawn: '已撤回' };
const STATUS_CLASSES = { pending: 'badge bg-warning text-dark', approved: 'badge bg-success', rejected: 'badge bg-danger', withdrawn: 'badge bg-secondary' };

const openUsageNotesModal = (pdfPath) => {
  usageNotesPdfPath.value = pdfPath;
  showUsageNotesModal.value = true;
};

const fetchData = async () => {
  try {
    myApplications.value = await fetchMyApplications(guestStore.guestMajorUnit);
  } catch (err) {
    error.value = '無法載入申請紀錄，請稍後再試。';
  }
};

onMounted(async () => {
  loading.value = true;
  await fetchData();
  loading.value = false;
});

const processedApplications = computed(() => {
  const filtered = myApplications.value.filter(app => selectedStatus.value ? app.status === selectedStatus.value : true);

  // --- Main Sorting Logic ---
  filtered.sort((a, b) => {
    // Primary sort: by submissionId to group actions
    if (a.submissionId && b.submissionId) {
      if (a.submissionId < b.submissionId) return -1;
      if (a.submissionId > b.submissionId) return 1;
    }
    // Secondary sort: by user-selected key
    let valA = a[sortKey.value];
    let valB = b[sortKey.value];
    if (sortKey.value === 'updatedAt') {
      valA = new Date(valA);
      valB = new Date(valB);
    }
    const comparison = valA < valB ? -1 : (valA > valB ? 1 : 0);
    return sortOrder.value === 'desc' ? -comparison : comparison;
  });

  const result = [];
  const handledActions = new Set();

  for (let i = 0; i < filtered.length; i++) {
    const app = { ...filtered[i], rowspan: {} };

    // --- Action Grouping (by submissionId or custodian) ---
    let actionKey = null;
    let actionGroup = [];
    if (app.status === 'pending' && app.submissionId) {
      actionKey = `sub-${app.submissionId}`;
      actionGroup = filtered.filter(a => a.status === 'pending' && a.submissionId === app.submissionId);
    } else if (app.status === 'approved') {
      actionKey = `cust-${app.affiliatedUnit}-${app.subUnit}-${app.custodian}`;
      actionGroup = filtered.filter(a => a.status === 'approved' && a.affiliatedUnit === app.affiliatedUnit && a.subUnit === app.subUnit && a.custodian === app.custodian);
    } else {
      actionKey = app.id;
      actionGroup = [app];
    }

    if (!handledActions.has(actionKey)) {
      app.rowspan.actions = actionGroup.length;
      handledActions.add(actionKey);
    } else {
      app.rowspan.actions = 0;
    }

    // --- Visual Grouping (for adjacent rows) ---
    const prev = i > 0 ? filtered[i - 1] : null;
    
    // affiliatedUnit
    if (!prev || app.affiliatedUnit !== prev.affiliatedUnit) {
        let count = 0; for (let j = i; j < filtered.length && filtered[j].affiliatedUnit === app.affiliatedUnit; j++) count++;
        app.rowspan.affiliatedUnit = count;
    } else app.rowspan.affiliatedUnit = 0;

    // subUnit
    if (!prev || app.subUnit !== prev.subUnit || app.affiliatedUnit !== prev.affiliatedUnit) {
        let count = 0; for (let j = i; j < filtered.length && filtered[j].subUnit === app.subUnit && filtered[j].affiliatedUnit === app.affiliatedUnit; j++) count++;
        app.rowspan.subUnit = count;
    } else app.rowspan.subUnit = 0;

    // unitControlContact
    if (!prev || app.unitControlContact !== prev.unitControlContact || app.subUnit !== prev.subUnit || app.affiliatedUnit !== prev.affiliatedUnit) {
        let count = 0; for (let j = i; j < filtered.length && filtered[j].unitControlContact === app.unitControlContact && filtered[j].subUnit === app.subUnit && filtered[j].affiliatedUnit === app.affiliatedUnit; j++) count++;
        app.rowspan.unitControlContact = count;
    } else app.rowspan.unitControlContact = 0;

    // reason
    if (!prev || app.reason !== prev.reason || app.subUnit !== prev.subUnit || app.affiliatedUnit !== prev.affiliatedUnit) {
        let count = 0; for (let j = i; j < filtered.length && filtered[j].reason === app.reason && filtered[j].subUnit === app.subUnit && filtered[j].affiliatedUnit === app.affiliatedUnit; j++) count++;
        app.rowspan.reason = count;
    } else app.rowspan.reason = 0;

    // updatedAt
    if (!prev || app.updatedAt !== prev.updatedAt || app.subUnit !== prev.subUnit || app.affiliatedUnit !== prev.affiliatedUnit) {
        let count = 0; for (let j = i; j < filtered.length && filtered[j].updatedAt === app.updatedAt && filtered[j].subUnit === app.subUnit && filtered[j].affiliatedUnit === app.affiliatedUnit; j++) count++;
        app.rowspan.updatedAt = count;
    } else app.rowspan.updatedAt = 0;

    result.push(app);
  }
  return result;
});

const translateStatus = (status) => statusOptions[status] || status;
const statusClass = (status) => STATUS_CLASSES[status] || 'badge bg-secondary';

const sortBy = (key) => {
  sortOrder.value = sortKey.value === key && sortOrder.value === 'asc' ? 'desc' : 'asc';
  sortKey.value = key;
};

const formatDateTime = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (e) { return '無效日期'; }
};

const withdrawApplication = async (app) => {
  const batch = myApplications.value.filter(a => a.submissionId === app.submissionId && a.status === 'pending');
  if (!confirm(`此操作將撤回 ${batch.length} 筆相關申請，確定嗎？`)) return;
  updating.value = true;
  try {
    await userWithdrawApplication(app.id);
    await fetchData();
    showToast(`共 ${batch.length} 筆申請已撤回。`, 'success');
  } catch (err) {
    showToast(err.message || '撤回申請失敗', 'danger');
  } finally {
    updating.value = false;
  }
};

const showToast = (message, type = 'info') => {
  toast.value = { show: true, message, type };
  nextTick(() => { toast.value.show = true; });
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
  if (!error.response || !error.response.data) return { message: error.message || '未知錯誤' };
  if (error.response.data instanceof Blob) {
    const errorText = await error.response.data.text();
    try { return JSON.parse(errorText); } catch (e) { return { message: '無法解析錯誤回應。' }; }
  }
  return error.response.data;
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
.container { max-width: 83%; }
.card { box-shadow: 0 4px 8px rgba(0,0,0,.05); border-radius: .5rem; }
.badge { font-size: 0.9em; }
.table-responsive { overflow-x: auto; }
.sortable-header { cursor: pointer; user-select: none; }
.sortable-header:hover { background-color: #f8f9fa; }

.collapse-toggle-icon {
  display: inline-block;
  transition: transform 0.3s ease-in-out;
}

.collapse-toggle-icon.rotated {
  transform: rotate(180deg);
}
</style>
