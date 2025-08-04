<template>
  <div class="login-container">
    <div class="card shadow">
      <div class="card-body p-4">
        <h3 class="card-title text-center mb-4">登入</h3>
        <form @submit.prevent="handleLogin">
          <div v-if="error" class="alert alert-danger">{{ error }}</div>
          <div class="mb-3">
            <label for="username" class="form-label">使用者名稱</label>
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
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { loginUser as apiLogin } from '../services/api';
import { useAuth } from '../composables/useAuth';

const username = ref('');
const password = ref('');
const error = ref(null);
const loading = ref(false);

const router = useRouter();
const { setToken } = useAuth();

const handleLogin = async () => {
  loading.value = true;
  error.value = null;
  try {
    const token = await apiLogin({ username: username.value, password: password.value });
    setToken(token);
    router.push('/');
  } catch (err) {
    error.value = '登入失敗，請檢查您的帳號或密碼。';
  } finally {
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