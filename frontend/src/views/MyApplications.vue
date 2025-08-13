<template>
  <div class="container mt-5">
    <div class="card">
      <!-- ... card-header ... -->
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
        <div v-if="loading" class="text-center">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">載入中...</span>
          </div>
        </div>
        <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-else-if="filteredApplications.length > 0" class="table-responsive">
          <table class="table table-striped">
            <thead>
              <tr>
                <th>所屬單位</th>
                <th>組別/股別</th>
                <th>保管人</th>
                <th>單位管控窗口</th>
                <th>申請狀態</th>
                <th>申請原因</th>
                <th>最後更新時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="app in filteredApplications" :key="app.id">
                <td>{{ app.affiliatedUnit }}</td>
                <td>{{ app.subUnit }}</td>
                <td>{{ app.custodian }}</td>
                <td>{{ app.unitControlContact }}</td>
                <td>
                  <span :class="statusClass(app.status)">{{ translateStatus(app.status) }}</span>
                </td>
                <td>{{ app.reason || '' }}</td>
                <td>{{ formatDateTime(app.updatedAt) }}</td>
                <td>
                  <button
                    v-if="app.status === 'pending'"
                    class="btn btn-sm btn-primary"
                    @click="withdrawApplication(app.id)"
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
                </td>
              </tr>
            </tbody>
          </table>
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useGuestStore } from '../stores/guest';
import { fetchMyApplications, userWithdrawApplication, downloadApplicationPdf, regenerateApplicationPdf } from '../services/api';
import Toast from '../components/Toast.vue';

const guestStore = useGuestStore();
const myApplications = ref([]);
const selectedStatus = ref(''); // For filtering
const loading = ref(true);
const error = ref(null);
const updating = ref(false);
const downloading = ref({}); // 追蹤每個申請的下載狀態
const toast = ref({ show: false, message: '', type: 'info' });
const route = useRoute();

const fetchData = async () => {
  try {
    myApplications.value = await fetchMyApplications(guestStore.guestMajorUnit);
  } catch (err) {
    error.value = '無法載入申請紀錄，請稍後再試。';
    console.error(err);
  }
};

onMounted(async () => {
  if (guestStore.isGuestMode && guestStore.guestMajorUnit) {
    await fetchData();

    // If we just submitted and the list is empty, it's likely a race condition.
    // Wait a bit and try fetching again.
    if (route.query.submitted === 'true' && myApplications.value.length === 0) {
      setTimeout(async () => {
        await fetchData();
        loading.value = false; // Hide spinner after the second attempt
      }, 1000); // Wait 1 second before refetching
    } else {
      loading.value = false;
    }
  } else {
    error.value = '無法確定您的單位，請重新登入。';
    loading.value = false;
  }
});

const filteredApplications = computed(() => {
  if (!selectedStatus.value) {
    return myApplications.value;
  }
  return myApplications.value.filter(app => app.status === selectedStatus.value);
});

const statusOptions = {
  '': '全部狀態',
  pending: '審核中',
  approved: '已核准',
  rejected: '已拒絕',
  withdrawn: '已撤回',
};

const translateStatus = (status) => {
  return statusOptions[status] || status;
};

const statusClass = (status) => {
  const classMap = {
    pending: 'badge bg-warning text-dark',
    approved: 'badge bg-success',
    rejected: 'badge bg-danger',
    withdrawn: 'badge bg-secondary',
  };
  return classMap[status] || 'badge bg-secondary';
};

const formatDateTime = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    // 使用 toLocaleString 並指定台灣時區與格式
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

const withdrawApplication = async (id) => {
  if (!confirm('您確定要撤回此筆申請嗎？')) return;
  updating.value = true;
  try {
    const updatedData = await userWithdrawApplication(id);
    const index = myApplications.value.findIndex(a => a.id === id);
    if (index !== -1) {
      // 直接用後端回傳的最新資料更新本地狀態，確保一致性
      myApplications.value[index] = updatedData.application;
    }
    showToast('申請已成功撤回。', 'success');
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

const downloadOrRegeneratePdf = async (app) => {
  downloading.value[app.id] = true;
  try {
    const response = await downloadApplicationPdf(app.id);
    // 為 blob 建立一個 URL
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const filename = `可攜式儲存媒體申請單_${app.affiliatedUnit}_${app.custodian}.pdf`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      // 後端回傳了 404，我們需要解析 Blob 中的 JSON 錯誤訊息
      try {
        const errorData = JSON.parse(await err.response.data.text());
        if (errorData.code === 'PDF_NOT_FOUND') {
          if (confirm('PDF檔案不存在。您是否要立即重新產生一份？')) {
            const regenResponse = await regenerateApplicationPdf(app.id);
            showToast(regenResponse.message, 'success');
            
            // 重新嘗試下載
            const retryResponse = await downloadApplicationPdf(app.id);
            const url = window.URL.createObjectURL(new Blob([retryResponse.data]));
            const link = document.createElement('a');
            link.href = url;
            const filename = `可攜式儲存媒體申請單_${app.affiliatedUnit}_${app.custodian}.pdf`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
          }
        } else {
          showToast(`下載錯誤: ${errorData.message || '未知錯誤'}`, 'danger');
        }
      } catch (parseError) {
        showToast('下載失敗，無法解析錯誤訊息。', 'danger');
      }
    } else {
      showToast(`下載失敗: ${err.message}`, 'danger');
    }
  } finally {
    downloading.value[app.id] = false;
  }
};
</script>
