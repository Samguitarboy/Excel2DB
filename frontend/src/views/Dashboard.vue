<template>
  <div class="container-fluid mt-4">
    <!-- Loading Overlay for status update -->
    <div v-if="isUpdatingStatus" class="loading-overlay">
      <div class="spinner-border text-light" style="width: 3rem; height: 3rem;" role="status">
        <span class="visually-hidden">正在更新...</span>
      </div>
      <p class="mt-3 fs-5 text-light">正在更新申請狀態，請稍候...</p>
    </div>

    <!-- Header Controls -->
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <!-- Panel Toggles -->
      <div v-if="!guestStore.isGuestMode" class="btn-group" role="group" aria-label="Toggle dashboard panels">
        <input type="checkbox" class="btn-check" id="toggle-review" v-model="panelVisibility.review" autocomplete="off">
        <label class="btn btn-outline-secondary" for="toggle-review">新款隨身碟申請審核列表</label>

        <input type="checkbox" class="btn-check" id="toggle-category" v-model="panelVisibility.category" autocomplete="off">
        <label class="btn btn-outline-secondary" for="toggle-category">可攜式儲存媒體-各種類總數統計</label>

        <input type="checkbox" class="btn-check" id="toggle-department" v-model="panelVisibility.department" autocomplete="off">
        <label class="btn btn-outline-secondary" for="toggle-department">各單位隨身碟/加密隨身碟數量統計</label>

        <input type="checkbox" class="btn-check" id="toggle-access-time" v-model="panelVisibility.accessTime" autocomplete="off">
        <label class="btn btn-outline-secondary" for="toggle-access-time">超過X天未存取之隨身碟/加密隨身碟數量統計</label>
      </div>
      
      <!-- Action Buttons -->
      <div class="d-flex gap-2">
        <router-link to="/" class="btn btn-primary">
          <i class="bi bi-list-ul me-2"></i>顯示完整清單列表
        </router-link>
        <button class="btn btn-outline-danger" @click="authStore.logout()">
          <i class="bi bi-box-arrow-right me-2"></i>登出
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center">
      <LoadingSpinner />
      <p>正在載入統計資料...</p>
    </div>
    <div v-if="!loading && error" class="alert alert-danger">
      {{ error }}
    </div>
    <div v-if="!loading && !error" class="row">
      <!-- Section 0: Application Review List (Admin only) -->
      <div v-if="panelVisibility.review && !guestStore.isGuestMode" class="col-12 mb-4">
        <div v-if="reviewLoading" class="text-center">
          <LoadingSpinner />
          <p>正在載入申請列表...</p>
        </div>
        <div v-else-if="reviewError" class="alert alert-danger">{{ reviewError }}</div>
        <div v-else>
          <div class="card">
            <div class="card-header">
              <ul class="nav nav-tabs card-header-tabs" id="application-tabs" role="tablist">
                <li class="nav-item" role="presentation">
                  <button class="nav-link" :class="{ active: activeReviewTab === 'pending' }" id="pending-tab" @click="activeReviewTab = 'pending'" type="button" role="tab" aria-controls="pending-panel" aria-selected="true">
                    待處理及歷史申請 <span class="badge rounded-pill" :class="otherApplications.length > 0 ? 'bg-warning text-dark' : 'bg-secondary'">{{ otherApplications.length }}</span>
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link" :class="{ active: activeReviewTab === 'approved' }" id="approved-tab" @click="activeReviewTab = 'approved'" type="button" role="tab" aria-controls="approved-panel" aria-selected="false">
                    已核准的申請 <span class="badge rounded-pill bg-success">{{ approvedApplications.length }}</span>
                  </button>
                </li>
              </ul>
            </div>
            <div class="card-body tab-content" id="application-tabs-content">
              <!-- Pending and History Tab Panel -->
              <div class="tab-pane fade" :class="{ 'show active': activeReviewTab === 'pending' }" id="pending-panel" role="tabpanel" aria-labelledby="pending-tab">
                <div class="d-flex justify-content-end align-items-center mb-3">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch" id="show-pending-only" v-model="showOnlyPending">
                    <label class="form-check-label" for="show-pending-only">僅顯示審核中</label>
                  </div>
                </div>
                <div v-if="paginatedOtherApplications.length > 0">
                  <div class="table-responsive">
                    <table class="table table-sm table-hover align-middle">
                      <thead>
                        <tr>
                          <th>所屬單位-組別/股別</th>
                          <th>保管人</th>
                          <th>申請狀態</th>
                          <th>來源 IP</th>
                          <th>申請原因</th>
                          <th>最後更新時間</th>
                          <th class="text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="app in paginatedOtherApplications" :key="app.id">
                          <td>{{ app.subUnit }}</td>
                          <td>{{ app.custodian }}</td>
                          <td><span :class="statusClass(app.status)">{{ translateStatus(app.status) }}</span></td>
                          <td>{{ app.sourceIp || 'N/A' }}</td>
                          <td>{{ app.reason || '該單位僅申請一支隨身碟' }}</td>
                          <td>{{ formatDateTime(app.updatedAt) }}</td>
                          <td class="text-center">
                            <button v-if="app.status === 'pending'" class="btn btn-sm btn-success me-2" @click="updateStatus(app.id, 'approved')">核准</button>
                            <button v-if="app.status === 'pending'" class="btn btn-sm btn-danger" @click="updateStatus(app.id, 'rejected')">拒絕</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <!-- Pagination -->
                  <nav v-if="totalPages > 1" class="mt-3" aria-label="Application pagination">
                    <ul class="pagination justify-content-center">
                      <li class="page-item" :class="{ disabled: currentPage === 1 }"><a class="page-link" href="#" @click.prevent="currentPage--">上一頁</a></li>
                      <li v-for="page in totalPages" :key="page" class="page-item" :class="{ active: currentPage === page }"><a class="page-link" href="#" @click.prevent="currentPage = page">{{ page }}</a></li>
                      <li class="page-item" :class="{ disabled: currentPage === totalPages }"><a class="page-link" href="#" @click.prevent="currentPage++">下一頁</a></li>
                    </ul>
                  </nav>
                </div>
                <p v-else class="text-center text-muted my-5">目前沒有待處理或歷史申請。</p>
              </div>

              <!-- Approved Tab Panel -->
              <div class="tab-pane fade" :class="{ 'show active': activeReviewTab === 'approved' }" id="approved-panel" role="tabpanel" aria-labelledby="approved-tab">
                <div v-if="paginatedApprovedApplications.length > 0">
                  <div class="table-responsive">
                    <table class="table table-sm table-hover align-middle">
                      <thead>
                        <tr>
                          <th>所屬單位-組別/股別</th>
                          <th>保管人</th>
                          <th>來源 IP</th>
                          <th>申請原因</th>
                          <th>核准時間</th>
                          <th class="text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="app in paginatedApprovedApplications" :key="app.id">
                          <td>{{ app.subUnit }}</td>
                          <td>{{ app.custodian }}</td>
                          <td>{{ app.sourceIp || 'N/A' }}</td>
                          <td>{{ app.reason || '該單位僅申請一支隨身碟' }}</td>
                          <td>{{ formatDateTime(app.updatedAt) }}</td>
                          <td class="text-center">
                            <a :href="`/api/applications/${app.id}/download`" class="btn btn-sm btn-info" target="_blank" rel="noopener noreferrer" title="在新分頁中預覽PDF">
                              <i class="bi bi-search"></i> 預覽PDF
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <!-- Pagination for Approved Applications -->
                  <nav v-if="approvedTotalPages > 1" class="mt-3" aria-label="Approved applications pagination">
                    <ul class="pagination justify-content-center">
                      <li class="page-item" :class="{ disabled: approvedCurrentPage === 1 }"><a class="page-link" href="#" @click.prevent="approvedCurrentPage--">上一頁</a></li>
                      <li v-for="page in approvedTotalPages" :key="page" class="page-item" :class="{ active: approvedCurrentPage === page }"><a class="page-link" href="#" @click.prevent="approvedCurrentPage = page">{{ page }}</a></li>
                      <li class="page-item" :class="{ disabled: approvedCurrentPage === approvedTotalPages }"><a class="page-link" href="#" @click.prevent="approvedCurrentPage++">下一頁</a></li>
                    </ul>
                  </nav>
                </div>
                <p v-else class="text-center text-muted my-5">目前沒有已核准的申請。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 1: Category Distribution -->
      <div v-if="panelVisibility.category" class="col-xl-6 col-lg-12 mb-4">
        <div class="card h-100">
          <div class="card-header">
            <h5 class="card-title mb-0">可攜式儲存媒體-各種類總數統計</h5>
          </div>
          <div class="card-body">
            <div v-if="categoryTableData.length" class="table-responsive">
              <table class="table table-sm table-hover">
                <thead>
                  <tr>
                    <th>分類</th>
                    <th class="text-end">數量</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in categoryTableData" :key="item.category">
                    <td>{{ item.category }}</td>
                    <td class="text-end">{{ item.count }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-center">沒有足夠的資料可供顯示。</p>
          </div>
        </div>
      </div>

      <!-- Section 2: USB Drives by Department -->
      <div v-if="panelVisibility.department" class="col-xl-6 col-lg-12 mb-4">
        <div class="card h-100">
          <div class="card-header">
            <h5 class="card-title mb-0">各單位隨身碟/加密隨身碟數量統計</h5>
          </div>
          <div class="card-body">
            <div v-if="departmentTableData.length" class="table-responsive">
              <table class="table table-sm table-hover">
                <thead>
                  <tr>
                    <th>所屬單位</th>
                    <th class="text-end">隨身碟</th>
                    <th class="text-end">加密隨身碟</th>
                    <th class="text-end">總計</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="item in departmentTableData" :key="item.department">
                    <tr @click="toggleDepartment(item.department)" style="cursor: pointer;" :class="{'table-light': item.sub_departments.length > 0}">
                      <td>
                        <i v-if="item.sub_departments.length > 0" :class="['bi', expandedDepartments[item.department] ? 'bi-chevron-down' : 'bi-chevron-right']"></i>
                        {{ item.department }}
                      </td>
                      <td class="text-end">{{ item.regularDrives }}</td>
                      <td class="text-end">{{ item.encryptedDrives }}</td>
                      <td class="text-end fw-bold">{{ item.total }}</td>
                    </tr>
                    <template v-if="item.sub_departments.length > 0 && expandedDepartments[item.department]">
                      <tr v-for="subItem in item.sub_departments" :key="subItem.department" class="sub-department-row">
                        <td class="ps-4">{{ subItem.department }}</td>
                        <td class="text-end">{{ subItem.regularDrives }}</td>
                        <td class="text-end">{{ subItem.encryptedDrives }}</td>
                        <td class="text-end">{{ subItem.total }}</td>
                      </tr>
                    </template>
                  </template>
                </tbody>
              </table>
            </div>
            <p v-else class="text-center">沒有足夠的資料可供顯示。</p>
          </div>
        </div>
      </div>

      <!-- Section 3: Last Access Time Analysis -->
      <div v-if="panelVisibility.accessTime" class="col-12 mb-4">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">超過{{ inactiveDays }}天未存取之隨身碟/加密隨身碟數量統計</h5>
          </div>
          <div class="card-body">
            <div class="row justify-content-center align-items-center mb-3">
              <div class="col-md-8">
                <label for="inactive-days-slider" class="form-label">
                  選取未存取天數：<span class="fw-bold text-primary">{{ inactiveDays }}</span> 天
                </label>
                <div class="range-slider-container">
                  <input type="range" class="form-range" id="inactive-days-slider" min="1" max="365" v-model.number="inactiveDays">
                  <div class="range-slider-labels">
                    <span v-for="label in sliderLabels" :key="label.value" :style="{ left: getLabelPosition(label.value) }">
                      {{ label.label }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <hr class="my-4">
            <h5 class="mb-3 text-center">統計結果</h5>
            <div class="row">
              <!-- Regular USBs Column -->
              <div class="col-lg-6 mb-4 mb-lg-0">
                <div class="card bg-light text-center">
                  <div class="card-body">
                    <p class="fs-5 mb-1"><strong>隨身碟</strong></p>
                    <p class="fs-3 fw-bold text-danger mb-0">{{ inactiveUsbCounts.regular }}</p>
                    <small>個</small>
                  </div>
                </div>
                <div v-if="inactiveRegularUsbList.length > 0" class="table-responsive mt-3" style="max-height: 400px;">
                  <table class="table table-sm table-striped table-hover">
                    <thead class="table-light sticky-top">
                      <tr>
                        <th>資產名稱</th>
                        <th>所屬單位</th>
                        <th>保管人</th>
                        <th>最後存取時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in inactiveRegularUsbList" :key="item['財產編號']">
                        <td>{{ item['資產名稱'] }}</td>
                        <td>{{ item['(自)所屬單位'] }}</td>
                        <td>{{ item['保管人'] || 'N/A' }}</td>
                        <td>{{ item['最後存取時間'] || '無紀錄' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <!-- Encrypted USBs Column -->
              <div class="col-lg-6">
                <div class="card bg-light text-center">
                  <div class="card-body">
                    <p class="fs-5 mb-1"><strong>加密隨身碟</strong></p>
                    <p class="fs-3 fw-bold text-success mb-0">{{ inactiveUsbCounts.encrypted }}</p>
                    <small>個</small>
                  </div>
                </div>
                <div v-if="inactiveEncryptedUsbList.length > 0" class="table-responsive mt-3" style="max-height: 400px;">
                  <table class="table table-sm table-striped table-hover">
                    <thead class="table-light sticky-top">
                      <tr>
                        <th>資產名稱</th>
                        <th>所屬單位</th>
                        <th>保管人</th>
                        <th>最後存取時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in inactiveEncryptedUsbList" :key="item['財產編號']">
                        <td>{{ item['資產名稱'] }}</td>
                        <td>{{ item['(自)所屬單位'] }}</td>
                        <td>{{ item['保管人'] || 'N/A' }}</td>
                        <td>{{ item['最後存取時間'] || '無紀錄' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useGuestStore } from '../stores/guest';
import { fetchExcelData, fetchPublicDataByUnit, getApplications, updateApplicationStatus } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import departmentHierarchy from '../data/departments.json';

const authStore = useAuthStore();
const guestStore = useGuestStore();

const loading = ref(true);
const error = ref(null);
const excelApplications = ref([]);
const expandedDepartments = ref({});
const panelVisibility = reactive({
  review: true,
  category: false,
  department: false,
  accessTime: true,
});

// --- State for Review Panel ---
const reviewApplications = ref([]);
const reviewLoading = ref(true);
const reviewError = ref(null);
const isUpdatingStatus = ref(false);
const currentPage = ref(1);
const approvedCurrentPage = ref(1);
const itemsPerPage = 10;
const showOnlyPending = ref(true);
const activeReviewTab = ref('pending'); // 'pending' or 'approved'

const toggleDepartment = (department) => {
  expandedDepartments.value[department] = !expandedDepartments.value[department];
};

// -- Fetch Data --
onMounted(async () => {
  try {
    if (guestStore.isGuestMode) {
      excelApplications.value = await fetchPublicDataByUnit(guestStore.guestUnit);
    } else {
      excelApplications.value = await fetchExcelData();
    }
  } catch (err) {
    error.value = '無法載入資料，請稍後再試。';
    console.error(err);
  } finally {
    loading.value = false;
  }

  if (!guestStore.isGuestMode) {
    try {
      const apps = await getApplications();
      // 依最後更新時間遞減排序 (新的在前面)
      apps.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      reviewApplications.value = apps;
    } catch (err) {
      reviewError.value = '無法載入申請審核列表。';
      console.error(err);
    } finally {
      reviewLoading.value = false;
    }
  }
});

// --- Computed Properties for Review Panel ---
const approvedApplications = computed(() => {
  return reviewApplications.value.filter(app => app.status === 'approved');
});

const otherApplications = computed(() => {
  const allOthers = reviewApplications.value.filter(app => app.status !== 'approved');
  if (showOnlyPending.value) {
    return allOthers.filter(app => app.status === 'pending');
  }
  return allOthers;
});

const approvedTotalPages = computed(() => {
  return Math.ceil(approvedApplications.value.length / itemsPerPage);
});

const paginatedApprovedApplications = computed(() => {
  // 當頁數因資料變動而超出範圍時，自動跳回最後一頁
  if (approvedTotalPages.value > 0 && approvedCurrentPage.value > approvedTotalPages.value) {
    approvedCurrentPage.value = approvedTotalPages.value;
  }
  const start = (approvedCurrentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return approvedApplications.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(otherApplications.value.length / itemsPerPage);
});

const paginatedOtherApplications = computed(() => {
  // 當頁數因資料變動而超出範圍時，自動跳回最後一頁
  if (totalPages.value > 0 && currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return otherApplications.value.slice(start, end);
});

// --- Methods for Review Panel ---
const updateStatus = async (id, status) => {
  isUpdatingStatus.value = true;
  try {
    // 確保載入畫面至少顯示 1 秒，以提供更好的使用者體驗
    const delay = new Promise(resolve => setTimeout(resolve, 1000));
    const [updatedApp] = await Promise.all([
      updateApplicationStatus(id, status),
      delay
    ]);

    const index = reviewApplications.value.findIndex(app => app.id === id);
    if (index !== -1) {
      reviewApplications.value[index] = updatedApp.application;
      // 更新後重新排序以維持順序 (新的在前面)
      reviewApplications.value.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
  } catch (err) {
    reviewError.value = `更新申請狀態失敗 (ID: ${id})，請稍後再試。`;
    console.error(err);
  } finally {
    isUpdatingStatus.value = false;
  }
};

const translateStatus = (status) => {
  const statusMap = {
    pending: '審核中',
    approved: '已核准',
    rejected: '已拒絕',
    withdrawn: '已撤回',
  };
  return statusMap[status] || status;
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

// -- Category Data Calculation --
const categoryTableData = computed(() => {
  const counts = excelApplications.value.reduce((acc, item) => {
    const category = item['(自)分類'] || '未分類';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
});

// -- Department Table Data --
const departmentTableData = computed(() => {
  const usbTypes = ['隨身碟', '加密隨身碟'];
  const departmentData = excelApplications.value
    .filter(item => usbTypes.includes(item['(自)分類']))
    .reduce((acc, item) => {
      const department = item['(自)所屬單位'] || '未分配';
      if (!acc[department]) {
        acc[department] = { '隨身碟': 0, '加密隨身碟': 0 };
      }
      acc[department][item['(自)分類']]++;
      return acc;
    }, {});

  const structuredData = departmentHierarchy.map(level1 => {
    const level1Data = departmentData[level1.department] || { '隨身碟': 0, '加密隨身碟': 0 };
    
    const subDepartments = level1.sub_departments.map(subDept => {
        const subDeptData = departmentData[subDept] || { '隨身碟': 0, '加密隨身碟': 0 };
        const regularDrives = subDeptData['隨身碟'] || 0;
        const encryptedDrives = subDeptData['加密隨身碟'] || 0;
        return {
            department: subDept,
            regularDrives,
            encryptedDrives,
            total: regularDrives + encryptedDrives,
        };
    });

    const level1Regular = level1Data['隨身碟'] || 0;
    const level1Encrypted = level1Data['加密隨身碟'] || 0;
    
    const subDepartmentsTotalRegular = subDepartments.reduce((sum, dept) => sum + dept.regularDrives, 0);
    const subDepartmentsTotalEncrypted = subDepartments.reduce((sum, dept) => sum + dept.encryptedDrives, 0);

    const totalRegular = level1Regular + subDepartmentsTotalRegular;
    const totalEncrypted = level1Encrypted + subDepartmentsTotalEncrypted;

    return {
      department: level1.department,
      regularDrives: totalRegular,
      encryptedDrives: totalEncrypted,
      total: totalRegular + totalEncrypted,
      sub_departments: subDepartments.filter(s => s.total > 0)
    };
  });

  const hierarchyDepts = new Set(departmentHierarchy.flatMap(d => [d.department, ...d.sub_departments]));
  const otherDepts = Object.keys(departmentData)
    .filter(dept => !hierarchyDepts.has(dept))
    .map(dept => {
        const regularDrives = departmentData[dept]['隨身碟'] || 0;
        const encryptedDrives = departmentData[dept]['加密隨身碟'] || 0;
        return {
            department: dept,
            regularDrives,
            encryptedDrives,
            total: regularDrives + encryptedDrives,
            sub_departments: []
        };
    });

  return [...structuredData, ...otherDepts].sort((a, b) => b.total - a.total);
});


// -- Last Access Time Analysis --
const inactiveDays = ref(30);
const sliderLabels = [
  { value: 1, label: '1' },
  { value: 30, label: '30' },
  { value: 90, label: '90' },
  { value: 180, label: '180' },
  { value: 365, label: '365' }
];

const getLabelPosition = (value) => {
  const min = 1;
  const max = 365;
  const position = ((value - min) / (max - min)) * 100;
  return `${position}%`;
};

const inactiveUsbList = computed(() => {
  if (!inactiveDays.value) return [];

  const now = new Date();
  const thresholdDate = new Date(now.getTime());
  thresholdDate.setDate(thresholdDate.getDate() - inactiveDays.value);

  const usbTypes = ['隨身碟', '加密隨身碟'];
  const filtered = excelApplications.value.filter(item => {
    if (!usbTypes.includes(item['(自)分類'])) {
      return false;
    }
    const lastAccessDateStr = item['最後存取時間'];
    if (!lastAccessDateStr || lastAccessDateStr.trim() === '') {
      return true;
    }
    const lastAccessDate = new Date(lastAccessDateStr.replace(/\//g, '-'));
    return isNaN(lastAccessDate.getTime()) || lastAccessDate < thresholdDate;
  });

  return filtered.sort((a, b) => {
    const dateStrA = a['最後存取時間'];
    const dateStrB = b['最後存取時間'];

    const isInvalidA = !dateStrA || dateStrA.trim() === '';
    const isInvalidB = !dateStrB || dateStrB.trim() === '';

    if (isInvalidA && isInvalidB) return 0;
    if (isInvalidA) return -1;
    if (isInvalidB) return 1;

    const dateA = new Date(dateStrA.replace(/\//g, '-'));
    const dateB = new Date(dateStrB.replace(/\//g, '-'));

    if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
    if (isNaN(dateA.getTime())) return -1;
    if (isNaN(dateB.getTime())) return 1;

    return dateA - dateB;
  });
});

const inactiveRegularUsbList = computed(() => {
  return inactiveUsbList.value.filter(item => item['(自)分類'] === '隨身碟');
});

const inactiveEncryptedUsbList = computed(() => {
  return inactiveUsbList.value.filter(item => item['(自)分類'] === '加密隨身碟');
});

const inactiveUsbCounts = computed(() => {
  return {
    regular: inactiveRegularUsbList.value.length,
    encrypted: inactiveEncryptedUsbList.value.length,
  };
});
</script>

<style scoped>
.card {
  box-shadow: 0 2px 4px rgba(0,0,0,.1);
}
.card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}
.card-title {
  color: #495057;
}
.sub-department-row {
  background-color: #fdfdfd;
}
.sub-department-row td {
  border-top: none;
}
.bi {
  margin-right: 0.5rem;
  transition: transform 0.2s ease-in-out;
}
.sticky-top {
  top: 0;
}
.range-slider-container {
  position: relative;
  padding-bottom: 1rem;
}
.range-slider-labels {
  position: absolute;
  bottom: -5px;
  left: 0;
  right: 0;
  font-size: 0.8rem;
  color: #6c757d;
}
.range-slider-labels span {
  position: absolute;
  transform: translateX(-50%);
}
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}
.page-item .page-link {
  cursor: pointer;
}
</style>