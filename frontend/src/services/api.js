import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import { useLoading } from '../composables/useLoading';

const { showLoading, hideLoading } = useLoading();

// 建立一個可重用的 axios 實例，並設定基礎 URL 和標頭
const apiClient = axios.create({
  baseURL: '/api', // 所有請求都會自動加上 /api 前綴
  headers: {
    'Content-Type': 'application/json',
  },
});

// 建立一個用於公開 API 的 axios 實例，不帶有認證攔截器
const publicApiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 請求攔截器 (用於需要認證的 API)
 * 
 * 1. 在每個請求發送前，呼叫 showLoading() 來顯示全域載入動畫。
 * 2. 從 Pinia store 中取得 token，並將其附加到請求的 Authorization 標頭中。
 */
apiClient.interceptors.request.use(
  (config) => {
    showLoading();
    const authStore = useAuthStore();
    const token = authStore.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    hideLoading(); // 如果請求設定出錯，也要隱藏載入動畫
    return Promise.reject(error);
  }
);

/**
 * 回應攔截器 (用於所有 API，包括公開 API)
 * 
 * 1. 在收到回應後，呼叫 hideLoading() 來隱藏全域載入動畫。
 * 2. 檢查是否有 401 (未授權) 或 403 (禁止) 錯誤，若有則自動登出。
 * 3. 統一處理並拋出一個更易讀的錯誤訊息。
 * 4. 自動解包後端回應中的 `data` 屬性。
 */
[apiClient, publicApiClient].forEach(client => {
  client.interceptors.response.use(
    (response) => {
      hideLoading();
      // 為了方便，直接回傳後端資料中的 data 部分，如果後端直接回傳陣列也能兼容
      return response.data.data || response.data;
    },
    (error) => {
      hideLoading();
      const authStore = useAuthStore();
      // 檢查是否為 token 失效或權限不足的錯誤
      // 注意：公開 API 不會觸發此登出邏輯，因為它們不依賴 token
      if (error.response && [401, 403].includes(error.response.status)) {
        authStore.logout(); // 自動登出
      }
      // 格式化錯誤訊息，優先使用後端提供的錯誤訊息
      const message = error.response?.data?.message || error.message || '發生未知錯誤';
      return Promise.reject(new Error(message));
    }
  );
});

// --- 認證相關 API 函式 ---

/**
 * 登入使用者並獲取 JWT。
 * @param {Object} credentials - 包含 username 和 password 的物件。
 * @returns {Promise<Object>} 返回後端的回應。
 */
export function loginUser(credentials) {
  return apiClient.post('/login', credentials);
}

/**
 * 從後端 API 獲取 Excel 資料 (需要認證)。
 * @returns {Promise<Array>} 返回包含資料的陣列。
 */
export function fetchExcelData() {
  console.log('Fetching Excel data...');
  return apiClient.get('/excel-data');
}

// --- 公開 API 函式 (無需認證) ---

/**
 * 從後端 API 獲取所有不重複的單位列表 (無需認證)。
 * @returns {Promise<Array<string>>} 返回包含單位名稱字串的陣列。
 */
export function fetchPublicUnits() {
  return publicApiClient.get('/public/units');
}

/**
 * 從後端 API 獲取指定單位的 Excel 資料 (無需認證)。
 * @param {string} unit - 要查詢的單位名稱。
 * @returns {Promise<Array>} 返回包含該單位資料的陣列。
 */
export function fetchPublicDataByUnit(unit) {
  return publicApiClient.get('/public/data', { params: { unit } });
}

/**
 * 從後端 API 獲取指定的多個單位的 Excel 資料 (無需認證)。
 * @param {Array<string>} units - 要查詢的單位名稱陣列。
 * @returns {Promise<Array>} 返回包含這些單位資料的陣列。
 */
export function fetchPublicDataByUnits(units) {
  return publicApiClient.post('/public/data-by-units', { units });
}

/**
 * 取得主要單位與其管控窗口的對應關係 (無需認證)。
 * @returns {Promise<Object>} 返回一個物件，key 是主要單位，value 是窗口。
 */
export function fetchDepartmentContacts() {
  return publicApiClient.get('/public/department-contacts');
}

/**
 * 取得分類為「隨身碟」的保管人及單位管控窗口列表 (無需認證)。
 * @returns {Promise<Object>} 返回包含 custodians 和 contactPersons 陣列的物件。
 */
export function fetchUsbDeviceContacts() {
  return publicApiClient.get('/public/usb-contacts');
}

/**
 * 提交新的可攜式儲存媒體申請表單 (無需認證)。
 * @param {Object} applicationData - 申請表單的資料。
 * @returns {Promise<Object>} 返回後端的回應。
 */
export function submitApplication(applicationData) {
  return publicApiClient.post('/applications', applicationData);
}

  /**
   * 取得某組別/股別的申請紀錄
   * @param {string} unit - 組別/股別名稱
   * @returns {Promise<Array>} 申請紀錄陣列
   */
  export function fetchMyApplications(unit) {
    return publicApiClient.get(`/applications/unit/${unit}`);
  }

  /**
   * 取得所有申請（管理者用）
   * @returns {Promise<Array>} 申請紀錄陣列
   */
  export function getApplications() {
    return publicApiClient.get('/applications');
  }

  /**
   * 更新申請狀態（管理者用）
   * @param {string} id - 申請ID
   * @param {string} status - 新狀態
   * @returns {Promise<Object>} 回應
   */
  export function updateApplicationStatus(id, status) {
    return publicApiClient.patch(`/applications/${id}/status`, { status });
  }