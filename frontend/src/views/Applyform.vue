<template>
  <div class="container mt-5">
    <!-- Loading Overlay -->
    <div v-if="isSubmitting" class="loading-overlay">
      <div class="spinner-border text-light" style="width: 3rem; height: 3rem;" role="status">
        <span class="visually-hidden">正在提交...</span>
      </div>
      <p class="mt-3 fs-5 text-light">正在提交申請，請稍候...</p>
    </div>

    <div class="card shadow">
      <div class="card-header">
        <h3 class="card-title">新式加密隨身碟申請</h3>
      </div>
      <div class="card-body">
        <form @submit.prevent="handleSubmit">
          <!-- 所屬單位 (唯讀顯示主要部門) -->
          <div class="mb-3">
            <label for="affiliatedUnit" class="form-label">所屬單位</label>
            <input 
              type="text" 
              class="form-control bg-light text-muted" 
              id="affiliatedUnit" 
              :value="guestStore.guestMajorUnit" 
              readonly 
            >
          </div>

          <!-- 單位管控窗口 (唯讀自動帶入) -->
          <div class="mb-3">
            <label for="unitControlContact" class="form-label">單位管控窗口</label>
            <input 
              type="text" 
              class="form-control bg-light text-muted" 
              id="unitControlContact" 
              v-model="unitControlContact" 
              readonly>
          </div>

          <!-- 多個申請項目 -->
          <div v-for="(app, appIndex) in applications" :key="appIndex" class="mb-3 p-3 border rounded">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <button v-if="applications.length > 1" type="button" class="btn btn-outline-danger btn-sm" @click="removeApplicationBlock(appIndex)">
                移除此組別/股別
              </button>
            </div>

            <!-- 組別/股別選擇 -->
            <div class="mb-3">
              <label :for="`subUnit-${appIndex}`" class="form-label">組別/股別 <span class="text-danger">*</span></label>
              <div class="input-group">
                <select class="form-select" :id="`subUnit-${appIndex}`" v-model="app.subUnit" required @change="handleSubUnitChange">
                  <option value="" disabled>請選擇組別/股別</option>
                  <option 
                    v-for="subUnit in guestStore.guestSubUnits" 
                    :key="subUnit" 
                    :value="subUnit"
                    :disabled="selectedSubUnits.has(subUnit) && subUnit !== app.subUnit"
                  >
                    {{ subUnit }} {{ selectedSubUnits.has(subUnit) && subUnit !== app.subUnit ? '(已選)' : '' }}
                  </option>
                </select>
                <button v-if="app.subUnit" type="button" class="btn btn-info" @click="showUnitUsbList(app.subUnit)">
                  查詢原先舊款隨身碟列表
                </button>
              </div>
            </div>

            <!-- 保管人欄位 (選擇組別/股別後顯示) -->
            <div v-if="app.subUnit">
              <div v-for="(custodian, custodianIndex) in app.custodians" :key="custodianIndex" class="mb-3">
                <label :for="`custodian-${appIndex}-${custodianIndex}`" class="form-label">
                  加密隨身碟 {{ custodianIndex + 1 }} - 保管人 <span class="text-danger">*</span>
                </label>
                <div class="input-group">
                  <input 
                    type="text" 
                    class="form-control" 
                    :id="`custodian-${appIndex}-${custodianIndex}`" 
                    v-model="app.custodians[custodianIndex]" 
                    required
                  >
                  <button 
                    v-if="app.custodians.length > 1" 
                    type="button" 
                    class="btn btn-outline-danger" 
                    @click="removeCustodian(appIndex, custodianIndex)"
                  >
                    移除
                  </button>
                </div>
              </div>
              <div class="text-end">
                <button type="button" class="btn btn-success btn-sm" @click="addCustodian(appIndex)">
                  + 新增
                </button>
              </div>

              <!-- 申請超過一支原因 (條件式顯示) -->
              <div v-if="app.custodians.length > 1" class="mt-3">
                <label :for="`reason-${appIndex}`" class="form-label">
                  申請超過一支，請填寫原因 
                  <span class="text-danger">*</span>
                </label>
                <textarea 
                  class="form-control" 
                  :id="`reason-${appIndex}`" 
                  rows="3" 
                  v-model="app.reason"
                  required
                ></textarea>
              </div>
            </div>
          </div>

          <div v-if="guestStore.guestSubUnits.length > 1" class="d-grid gap-2 mb-3">
            <button type="button" class="btn btn-outline-success" @click="addApplicationBlock">+ 新增其他組別/股別</button>
          </div>

          <div class="d-flex justify-content-between mt-4">
            <router-link to="/" class="btn btn-secondary">返回列表</router-link>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitDisabled">提出申請</button>
          </div>
        </form>
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
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useGuestStore } from '../stores/guest';
import { fetchPublicDataByUnits, submitApplication } from '../services/api.js';
import Toast from '../components/Toast.vue';
import departments from '../data/departments.json';

const guestStore = useGuestStore();
const router = useRouter();

// Loading state for submission
const isSubmitting = ref(false);

// 組/股別陣列
const applications = ref([
  {
    subUnit: '',
    custodians: [''], // 每個組/股別區塊可以有多個保管人
    reason: '',
  }
]);

// 單位管控窗口
const unitControlContact = ref('');

// 根據主要部門更新管控窗口
const updateContactPerson = (majorUnit) => {
  if (majorUnit) {
    const departmentInfo = departments.find(dept => dept.department === majorUnit);
    if (departmentInfo) {
      unitControlContact.value = departmentInfo.contactperson;
    } else {
      unitControlContact.value = '';
    }
  } else {
    unitControlContact.value = '';
  }
};

// 監控主要單位的變化
watch(() => guestStore.guestMajorUnit, (newMajorUnit) => {
  updateContactPerson(newMajorUnit);
}, { immediate: true }); // immediate: true 確保組件載入時立即執行

// 計算提交按鈕是否應被禁用
const isSubmitDisabled = computed(() => {
  // 1. 檢查主要單位是否存在
  if (!guestStore.guestMajorUnit) {
    return true;
  }

  // 2. 遍歷所有申請區塊，檢查是否有未填寫的欄位
  return applications.value.some(app => {
    // 檢查組/股別是否選擇
    if (!app.subUnit) return true;
    // 檢查是否有保管人，且保管人欄位不能為空
    if (app.custodians.length === 0 || app.custodians.some(c => !c.trim())) return true;
    // 如果保管人超過一位，檢查原因是否填寫
    if (app.custodians.length > 1 && !app.reason.trim()) return true;
    
    return false; // 此區塊驗證通過
  });
});

// 計算已選擇的組/股別，用於禁用重複選項
const selectedSubUnits = computed(() => {
  return new Set(applications.value.map(app => app.subUnit).filter(Boolean));
});

// Toast 提示訊息的狀態
const toast = ref({ show: false, message: '', type: 'info' }); 

// 儲存從後端獲取的原始資料
const unitExcelData = ref([]); 

// --- 生命週期鉤子 (Lifecycle Hook) ---
onMounted(async () => {
  // 立即根據 store 中的主要單位設定窗口聯繫人
  updateContactPerson(guestStore.guestMajorUnit);

  try {
    if (guestStore.isGuestMode && guestStore.guestSubUnits.length > 0) {
      unitExcelData.value = await fetchPublicDataByUnits(guestStore.guestSubUnits);
    } else {
      showToast('請先回上頁選擇單位。', 'danger');
    }
  } catch (err) {
    console.error('Error fetching public data by unit:', err);
    showToast('無法載入該單位隨身碟列表，請稍後再試。', 'danger');
  }
});

// 新增一個組/股別區塊
const addApplicationBlock = () => {
  applications.value.push({
    subUnit: '',
    custodians: [''],
    reason: '',
  });
};

// 移除一個組/股別申請區塊
const removeApplicationBlock = (appIndex) => {
  if (applications.value.length > 1) {
    applications.value.splice(appIndex, 1);
  }
};

// 在指定組/股別區塊中新增保管人
const addCustodian = (appIndex) => {
  applications.value[appIndex].custodians.push('');
};

// 從指定組/股別區塊中移除保管人
const removeCustodian = (appIndex, custodianIndex) => {
  const app = applications.value[appIndex];
  if (app.custodians.length > 1) {
    app.custodians.splice(custodianIndex, 1);
  }
};

// 提交表單
const handleSubmit = async () => {
  if (isSubmitDisabled.value) {
    showToast('請完整填寫所有必填欄位！', 'danger');
    return;
  }

  isSubmitting.value = true;

  // 將資料結構扁平化以符合後端需求
  const flattenedApplications = applications.value.flatMap(app => {
    const reasonForThisBlock = app.custodians.length > 1 ? app.reason : '';
    return app.custodians.map(custodian => ({
      subUnit: app.subUnit,
      custodian: custodian,
      unitControlContact: unitControlContact.value,
      reason: reasonForThisBlock,
    }));
  });

  const submissionData = {
    affiliatedUnit: guestStore.guestMajorUnit, // 提交主要單位
    applications: flattenedApplications,
  };

  try {
    const response = await submitApplication(submissionData);
    console.log('申請提交成功:', response);
    router.push('/my-applications');
  } catch (err) {
    console.error('申請提交失敗:', err);
    showToast('申請提交失敗，請稍後再試。', 'danger');
  } finally {
    isSubmitting.value = false;
  }
};

/**
 * 處理子單位變更事件，隱藏現有的 Toast
 */
const handleSubUnitChange = () => {
  // 如果當前有 Toast 顯示，則將其關閉
  if (toast.value.show) {
    toast.value.show = false;
  }
};

/**
 * 顯示 Toast 提示訊息
 */
function showToast(message, type = 'info') {
  toast.value.message = message;
  toast.value.type = type;
  toast.value.show = false; 
  nextTick(() => {
    toast.value.show = true;
  });
}

/**
 * 顯示指定子單位的隨身碟列表
 * @param {string} selectedUnit - 要顯示資料的子單位。
 */
const showUnitUsbList = (selectedUnit) => {
  if (!selectedUnit) return;

  const title = `${selectedUnit} 原先隨身碟列表：\n\n`;
  
  // 篩選出特定單位且分類為隨身碟的資料
  const dataToShow = unitExcelData.value.filter(row =>
    row['(自)所屬單位'] === selectedUnit &&
    (row['(自)分類'] === '隨身碟' || row['(自)分類'] === '加密隨身碟')
  );

  let message = title;
  if (dataToShow.length > 0) {
    dataToShow.forEach((row, index) => {
      message += `${index + 1}. 資產名稱: ${row['資產名稱'] || '無'}, 保管人: ${row['保管人'] || '無'}\n`;
    });
  } else {
    message += '此組/股別目前無隨身碟資料';
  }

  showToast(message, 'info');
};
</script>

<style scoped>
.container {
  max-width: 800px;
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
</style>