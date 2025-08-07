<template>
  <div class="container mt-5">
    <div class="card shadow">
      <div class="card-header">
        <h3 class="card-title">新式加密隨身碟申請</h3>
      </div>
      <div class="card-body">
        <form @submit.prevent="handleSubmit">
          <!-- 所屬單位 (自動帶入，唯讀) - 放在所有申請項目上方 -->
          <div class="mb-3">
            <label for="affiliatedUnit" class="form-label">所屬單位</label>
            <input 
              type="text" 
              class="form-control" 
              id="affiliatedUnit" 
              :value="guestStore.guestUnit" 
              readonly 
              :disabled="guestStore.isGuestMode" 
              :class="{ 'bg-light': guestStore.isGuestMode, 'text-muted': guestStore.isGuestMode }"
            >
          </div>

          <!-- 多個申請項目 -->
          <div v-for="(app, index) in applications" :key="index" class="mb-4 p-3 border rounded">
            <h5>加密隨身碟 {{ index + 1 }}</h5>
            <!-- 申請人 -->
            <div class="mb-3">
              <label :for="`applicant-${index}`" class="form-label">申請人 <span class="text-danger">*</span></label>
              <input type="text" class="form-control" :id="`applicant-${index}`" v-model="app.applicant" required>
            </div>

            <!-- 保管人 -->
            <div class="mb-3">
              <label :for="`custodian-${index}`" class="form-label">保管人 <span class="text-danger">*</span></label>
              <input type="text" class="form-control" :id="`custodian-${index}`" v-model="app.custodian" required>
            </div>

            <!-- 單位管控窗口 -->
            <div class="mb-3">
              <label :for="`unitControlContact-${index}`" class="form-label">單位管控窗口 <span class="text-danger">*</span></label>
              <input type="text" class="form-control" :id="`unitControlContact-${index}`" v-model="app.unitControlContact" required>
            </div>

            <!-- 移除按鈕 (當有多個申請項目時顯示) -->
            <div v-if="applications.length > 1" class="text-end">
              <button type="button" class="btn btn-outline-danger btn-sm" @click="removeApplication(index)">移除</button>
            </div>
          </div>

          <!-- 新增申請項目按鈕 -->
          <div class="mb-3 text-center">
            <button type="button" class="btn btn-success" @click="addApplication">+ 新增申請項目</button>
          </div>

          <!-- 申請兩支以上原因 (條件式顯示) -->
          <div class="mb-3">
            <label for="reasonForMore" class="form-label">申請兩支以上原因</label>
            <textarea class="form-control" id="reasonForMore" rows="3" v-model="reasonForMore" :disabled="applications.length < 2"></textarea>
          </div>

          <div class="d-flex justify-content-between mt-4">
            <router-link to="/" class="btn btn-secondary">返回列表</router-link>
            <button type="button" class="btn btn-info" @click="toggleUnitDataTableFilter">
              {{ isFiltered ? '顯示全部列表' : '僅顯示隨身碟列表' }}
            </button>
            <button type="submit" class="btn btn-primary">提交申請</button>
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
import { ref, onMounted, nextTick } from 'vue';
import { useGuestStore } from '../stores/guest';
import { fetchPublicDataByUnit, submitApplication } from '../services/api.js';
import Toast from '../components/Toast.vue';

const guestStore = useGuestStore();

// 申請項目陣列
const applications = ref([
  {
    applicant: '',
    custodian: '',
    unitControlContact: '',
  }
]);

// 申請兩支以上原因
const reasonForMore = ref('');

// Toast 提示訊息的狀態
const toast = ref({ show: false, message: '', type: 'info' }); 

// 儲存從後端獲取的原始資料
const unitExcelData = ref([]); 

// --- 新增狀態 ---
// 用於追蹤是否已篩選隨身碟列表
const isFiltered = ref(false); 

// --- 生命週期鉤子 (Lifecycle Hook) ---
onMounted(async () => {
  try {
    // 根據來賓模式的單位獲取資料
    if (guestStore.guestUnit) {
      unitExcelData.value = await fetchPublicDataByUnit(guestStore.guestUnit);
    } else {
      // 如果不是來賓模式，或者沒有選擇單位，可以選擇不載入資料或顯示提示
      showToast('請先選擇單位以查看相關列表。', 'danger');
    }
  } catch (err) {
    console.error('Error fetching public data by unit:', err);
    showToast('無法載入該單位隨身碟列表，請稍後再試。', 'danger');
  }
});

// 新增申請項目
const addApplication = () => {
  applications.value.push({
    applicant: '',
    custodian: '',
    unitControlContact: '',
  });
};

// 移除申請項目
const removeApplication = (index) => {
  if (applications.value.length > 1) {
    applications.value.splice(index, 1);
  }
};

// 提交表單
const handleSubmit = async () => {
  // 驗證所有申請項目是否填寫完整
  for (const app of applications.value) {
    if (!app.applicant || !app.custodian || !app.unitControlContact) {
      showToast('請填寫所有必填的申請項目欄位！', 'danger');
      return;
    }
  }

  const submissionData = {
    affiliatedUnit: guestStore.guestUnit,
    applications: applications.value,
    reasonForMore: applications.value.length >= 2 ? reasonForMore.value : '',
  };

  try {
    const response = await submitApplication(submissionData);
    console.log('申請提交成功:', response);
    showToast('申請已提交！', 'success');
    // 提交成功後可以清空表單或導向其他頁面
    // 例如：router.push('/');
  } catch (err) {
    console.error('申請提交失敗:', err);
    showToast('申請提交失敗，請稍後再試。', 'danger');
  }
};

/**
 * 顯示 Toast 提示訊息
 * @param {string} message - 要顯示的訊息
 * @param {string} [type='info'] - 提示類型 (例如: danger, success, info)
 */
function showToast(message, type = 'info') {
  toast.value.message = message;
  toast.value.type = type;
  toast.value.show = false; // 先隱藏再顯示，確保動畫效果
  nextTick(() => {
    toast.value.show = true;
  });
}

/**
 * 顯示或切換原先隨身碟列表的 Toast 訊息
 */
const toggleUnitDataTableFilter = () => {
  isFiltered.value = !isFiltered.value; // 切換篩選狀態
  
  let dataToShow = unitExcelData.value;
  let title = '原單位所有資產列表：\n\n';

  if (isFiltered.value) {
    title = '原單位隨身碟列表：\n\n';
    dataToShow = unitExcelData.value.filter(row => 
      row['(自)分類'] === '隨身碟' || row['(自)分類'] === '加密隨身碟'
    );
  }

  let message = title;
  if (dataToShow.length > 0) {
    dataToShow.forEach((row, index) => {
      message += `--- ${index + 1} ---\n`;
      message += `- 資產名稱: ${row['資產名稱'] || '無'}\n`;
      message += `- (自)分類: ${row['(自)分類'] || '無'}\n`;
      message += `- 保管人: ${row['保管人'] || '無'}\n`;
      message += `- 單位管控窗口: ${row['(自)單位管控窗口'] || '無'}\n`;
    });
  } else {
    message += '無符合條件的資料';
  }

  showToast(message, 'info');
};
</script>

<style scoped>
.container {
  max-width: 800px;
}
</style>