<template>
  <div class="container mt-5">
    <div class="card">
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
                <td>{{ app.reason || '無' }}</td>
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useGuestStore } from '../stores/guest';
import { fetchMyApplications, updateApplicationStatus } from '../services/api';

const guestStore = useGuestStore();
const myApplications = ref([]);
const selectedStatus = ref(''); // For filtering
const loading = ref(true);
const error = ref(null);
const updating = ref(false);

onMounted(async () => {
  if (guestStore.isGuestMode && guestStore.guestMajorUnit) {
    try {
      myApplications.value = await fetchMyApplications(guestStore.guestMajorUnit);
    } catch (err) {
      error.value = '無法載入申請紀錄，請稍後再試。';
      console.error(err);
    } finally {
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
    await updateApplicationStatus(id, 'withdrawn');
    const app = myApplications.value.find(a => a.id === id);
    if (app) {
      app.status = 'withdrawn';
    }
  } catch (err) {
    error.value = '無法撤回申請，請稍後再試。';
    console.error(err);
  } finally {
    updating.value = false;
  }
};
</script>
