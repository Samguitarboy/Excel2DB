<template>
  <div>
    <AnnouncementModal v-if="showAnnouncement" @close="handleAnnouncementClose" />
    <div v-if="!showAnnouncement" class="login-container">
      <div class="card shadow">
        <div class="card-body p-4">
          <h3 class="card-title text-center mb-4">可攜式儲存媒體使用情形</h3>
          <form @submit.prevent="handleLogin">
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <div class="mb-3">
              <label for="username" class="form-label">管理者名稱</label>
              <input type="text" class="form-control" id="username" v-model="username" required>
            </div>
            <div class="mb-3">
              <label for="password" class="form-label">密碼</label>
              <input type="password" class="form-control" id="password" v-model="password" required>
            </div>
            <div class="d-grid">
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                {{ loading ? '登入中...' : '登入' }}
              </button>
            </div>
            <div class="d-grid mt-2">
              <router-link to="/guest-login" class="btn btn-outline-secondary">或以來賓身分查看特定單位</router-link>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { loginUser as apiLogin } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AnnouncementModal from '../components/AnnouncementModal.vue';

// -- state --
const username = ref('');
const password = ref('');
const error = ref(null); // 用於儲存登入失敗的錯誤訊息
const loading = ref(false); // 用於控制登入按鈕的禁用狀態和顯示文字
const showAnnouncement = ref(true); // 控制公告是否顯示

// -- services --
const router = useRouter();
const authStore = useAuthStore();

const handleAnnouncementClose = () => {
  showAnnouncement.value = false;
};

/**
 * 處理登入邏輯
 */
const handleLogin = async () => {
  loading.value = true; // 開始登入，禁用按鈕
  error.value = null;   // 清除之前的錯誤訊息

  try {
    // 呼叫 API 進行登入
    const response = await apiLogin({ 
      username: username.value, 
      password: password.value 
    });

    // 登入成功後，使用 auth store 來儲存 token
    authStore.setToken(response.token);

    // 使用 router 導向到儀表板
    router.push('/dashboard');

  } catch (err) {
    // 如果 API 呼叫失敗，顯示錯誤訊息
    // 注意：axios 攔截器已經處理了網路層面的錯誤，這裡的 catch 主要處理業務邏輯上的失敗
    error.value = '登入失敗，請檢查您的帳號或密碼。';

  } finally {
    // 無論成功或失敗，最終都結束載入狀態
    loading.value = false;
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
