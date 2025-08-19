<template>
  <div>
    <AnnouncementModal v-if="showAnnouncement" @close="handleAnnouncementClose" />
    <div v-if="!showAnnouncement" class="login-container">
      <div class="card shadow">
        <div class="card-body p-4">
          <h3 class="card-title text-center mb-4">可攜式儲存媒體使用情形</h3>

          <!-- 登入表單，僅在 showAdminLogin 為 true 時顯示 -->
          <form v-if="showAdminLogin" @submit.prevent="handleLogin">
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <div class="mb-3">
              <label for="username" class="form-label">管理者名稱<span style="color: red;">*</span></label>
              <input type="text" class="form-control" id="username" v-model="username" required>
            </div>
            <div class="mb-3">
              <label for="password" class="form-label">密碼<span style="color: red;">*</span></label>
              <input type="password" class="form-control" id="password" v-model="password" required>
            </div>
            <div class="d-grid gap-2">
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                {{ loading ? '登入中...' : '登入' }}
              </button>
              <button type="button" class="btn btn-outline-secondary" @click="goBackToSelection">
                返回
              </button>
            </div>
          </form>

          <!-- 初始按鈕，僅在 showAdminLogin 為 false 時顯示 -->
          <div v-else class="d-grid gap-2">
            <button type="button" class="btn btn-primary" @click="showAdminLogin = true">
              資訊室管理者登入
            </button>
            <router-link to="/guest-login" class="btn btn-outline-secondary">
              廠內同仁查詢所屬單位使用情形
            </router-link>
            <router-link to="/regulations" class="btn btn-info">
              查看可攜式儲存媒體相關規定
            </router-link>
          </div>

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
const showAdminLogin = ref(false); // 控制是否顯示管理者登入表單

// -- services --
const router = useRouter();
const authStore = useAuthStore();

const handleAnnouncementClose = () => {
  showAnnouncement.value = false;
};

/**
 * 返回到初始的登入類型選擇畫面。
 */
const goBackToSelection = () => {
  showAdminLogin.value = false;
  error.value = null; // 清除可能存在的錯誤訊息
  // 可選擇性地清除輸入框內容
  username.value = '';
  password.value = '';
};

/**
 * 處理登入邏輯
 */
const handleLogin = async () => {
  if (loading.value) return; // 防止重複提交
  
  loading.value = true; // 開始登入，禁用按鈕
  error.value = null;   // 清除之前的錯誤訊息

  try {
    // 呼叫 API 進行登入
    const response = await apiLogin({ 
      username: username.value, 
      password: password.value 
    });

    if (!response?.token) {
      throw new Error('登入失敗：未收到有效的登入憑證');
    }

    // 登入成功後，使用 auth store 來儲存 token
    authStore.setToken(response.token);

    // 使用 router 導向到儀表板
    router.push('/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    error.value = err.message;
  } finally {
    loading.value = false; // 確保無論如何都會結束 loading 狀態
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
