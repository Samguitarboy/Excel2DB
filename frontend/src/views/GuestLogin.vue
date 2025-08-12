<template>
  <div class="login-container">
    <div class="card shadow">
      <div class="card-body p-4">
        <h3 class="card-title text-center mb-4">可攜式儲存媒體使用情形</h3>
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div class="mb-3">
          <label for="unitSelect" class="form-label">請選擇所屬單位</label>
          <select
            id="unitSelect"
            class="form-select"
            v-model="selectedMajorUnit"
            :disabled="loadingUnits"
          >
            <option value="" disabled>-- 請選擇 --</option>
            <option v-for="unit in majorUnits" :key="unit" :value="unit">{{ unit }}</option>
          </select>
        </div>
        <div v-if="contactPerson" class="mt-2 text-muted">
          <p><strong>新款加密隨身碟~<br>請由單位窗口 {{ contactPerson }} 負責申請！</strong></p>
        </div>
        <div class="d-grid">
          <button
            type="button"
            class="btn btn-primary"
            @click="handleGuestLogin"
            :disabled="!selectedMajorUnit || loadingUnits"
          >
            <span v-if="loadingUnits" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            {{ loadingUnits ? '載入單位...' : '查詢該單位使用情形' }}
          </button>
        </div>
        <div class="text-center mt-3">
          <router-link to="/login" class="text-decoration-none">返回登入頁</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGuestStore } from '../stores/guest.js';
import departmentHierarchy from '../data/departments.json';

const majorUnits = ref([]);
const selectedMajorUnit = ref('');
const contactPerson = ref('');
const error = ref(null);
const loadingUnits = ref(false);

const router = useRouter();
const guestStore = useGuestStore();

onMounted(() => {
  try {
    // Extract major departments from the imported JSON
    majorUnits.value = departmentHierarchy.map(dept => dept.department).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  } catch (err) {
    error.value = '無法載入單位列表，請稍後再試。';
  }
});

watch(selectedMajorUnit, (newUnit) => {
  if (newUnit) {
    const selectedDept = departmentHierarchy.find(
      (dept) => dept.department === newUnit
    );
    contactPerson.value = selectedDept ? selectedDept.contactperson : '';
  } else {
    contactPerson.value = '';
  }
});

const handleGuestLogin = () => {
  if (selectedMajorUnit.value) {
    const selectedDept = departmentHierarchy.find(
      (dept) => dept.department === selectedMajorUnit.value
    );
    
    if (selectedDept && selectedDept.sub_departments.length > 0) {
      // 傳遞主要部門名稱和子單位陣列到 store
      guestStore.setGuestMode(selectedMajorUnit.value, selectedDept.sub_departments);
      router.push('/'); // Redirect to Home.vue
    } else {
      error.value = '該主要單位底下沒有可查詢的子單位。';
    }
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
}
.card {
  width: 100%;
  max-width: 400px;
}
</style>