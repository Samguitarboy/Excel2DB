<template>
  <div class="login-container">
    <div class="card shadow">
      <div class="card-body p-4">
        <h3 class="card-title text-center mb-4">以來賓身分查看</h3>
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div class="mb-3">
          <label for="unitSelect" class="form-label">請選擇單位</label>
          <select
            id="unitSelect"
            class="form-select"
            v-model="selectedUnit"
            :disabled="loadingUnits"
          >
            <option value="" disabled>-- 請選擇 --</option>
            <option v-for="unit in units" :key="unit" :value="unit">{{ unit }}</option>
          </select>
        </div>
        <div class="d-grid">
          <button
            type="button"
            class="btn btn-primary"
            @click="handleGuestLogin"
            :disabled="!selectedUnit || loadingUnits"
          >
            <span v-if="loadingUnits" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            {{ loadingUnits ? '載入單位...' : '查看該單位使用情形' }}
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchPublicUnits } from '../services/api.js';
import { useGuestStore } from '../stores/guest.js';

const units = ref([]);
const selectedUnit = ref('');
const error = ref(null);
const loadingUnits = ref(true);

const router = useRouter();
const guestStore = useGuestStore();

onMounted(async () => {
  try {
    units.value = await fetchPublicUnits();
    loadingUnits.value = false;
  } catch (err) {
    error.value = '無法載入單位列表，請稍後再試。';
    loadingUnits.value = false;
  }
});

const handleGuestLogin = () => {
  if (selectedUnit.value) {
    guestStore.setGuestMode(selectedUnit.value);
    router.push('/'); // 跳轉到 Home.vue
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
