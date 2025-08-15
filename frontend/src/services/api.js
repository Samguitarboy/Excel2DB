import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import { useGuestStore } from '../stores/guest';
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
 * 回應攔截器 (用於所有 API 客戶端)
 * 
 * 1. 在收到回應後，隱藏全域載入動畫。
 * 2. 如果成功，則自動解包後端回應中的 `data` 屬性。
 * 3. 如果失敗，則進行判斷：
 *    a. 如果是**非登入請求**的 401/403 錯誤，則自動登出。
 *    b. 對於所有其他錯誤 (包括登入失敗)，則格式化錯誤訊息並將其拋出。
 */
/**
 * 通用的回應成功處理器：隱藏載入動畫並解包資料。
 */
const handleSuccess = (response) => {
  hideLoading();
  return response.data.data || response.data;
};

/**
 * 通用的錯誤訊息格式化器。
 */
const formatError = (error) => {
  hideLoading();
  const message = error.response?.data?.message || error.message || '發生未知錯誤';
  return Promise.reject(new Error(message));
};

// --- publicApiClient 攔截器 (職責：絕不觸發登出) ---
// 用於登入、註冊等公開 API。
publicApiClient.interceptors.response.use(
  (response) => {
    hideLoading();
    return response.data;
  },
  (error) => {
    hideLoading();
    const message = error.response?.data?.message || error.message || '登入失敗，請檢查您的帳號或密碼。';
    return Promise.reject(new Error(message));
  }
);

// --- apiClient 攔截器 (職責：在必要時觸發登出) ---
// 用於所有需要認證的 API。
apiClient.interceptors.response.use(
  handleSuccess,
  (error) => {
    // 如果是 401/403 權限錯誤，表示 token 失效或無權限，執行登出。
    if (error.response && [401, 403].includes(error.response.status)) {
      const authStore = useAuthStore();
      authStore.logout();
      // 返回一個永遠不會解析的 Promise，以中斷當前的 Promise 鏈，防止後續程式碼執行。
      return new Promise(() => {});
    }
    // 對於其他錯誤 (如 500 伺服器錯誤)，則正常拋出。
    return formatError(error);
  }
);

// --- 認證相關 API 函式 ---

/**
 * 登入使用者並獲取 JWT。
 * @param {Object} credentials - 包含 username 和 password 的物件。
 * @returns {Promise<Object>} 返回後端的回應。
 */
export async function loginUser(credentials) {
  try {
    const response = await publicApiClient.post('/login', credentials);
    if (!response.token) {
      throw new Error('未收到有效的登入憑證');
    }
    return response;
  } catch (error) {
    hideLoading();
    const errorMessage = error.response?.data?.message || error.message || '登入失敗，請檢查您的帳號或密碼。';
    throw new Error(errorMessage);
  }
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
   * 使用者撤回自己的申請 (無需認證)
   * @param {string} id - 申請ID
   * @returns {Promise<Object>} 回應
   */
  export function userWithdrawApplication(id) {
    return publicApiClient.patch(`/applications/${id}/withdraw`);
  }

  /**
   * 取得所有申請（管理者用）
   * @returns {Promise<Array>} 申請紀錄陣列
   */
  export function getApplications() {
    return apiClient.get('/applications');
  }

  /**
   * 更新申請狀態（管理者用）
   * @param {string} id - 申請ID
   * @param {string} status - 新狀態
   * @returns {Promise<Object>} 回應
   */
  export function updateApplicationStatus(id, status) {
    return apiClient.patch(`/applications/${id}/status`, { status });
  }

  /**
   * 下載指定申請ID的PDF檔案。
   * @param {string} id - 申請ID。
   * @returns {Promise<Blob>} 一個解析為PDF檔案Blob的Promise。
   */
  export function downloadApplicationPdf(id) {
    // 注意：我們不使用標準的攔截器，因為需要特別處理 blob 回應類型和潛在的 404 錯誤。
    return axios.get(`/api/applications/${id}/download`, {
      responseType: 'blob',
    });
  }

  /**
   * 觸發重新產生指定申請ID的PDF檔案。
   * @param {string} id - 申請ID。
   * @returns {Promise<Object>} 伺服器的回應。
   */
  export function regenerateApplicationPdf(id) {
    // 這個請求會通過 publicApiClient，因此會顯示全域載入動畫
    return publicApiClient.post(`/applications/${id}/regenerate-pdf`);
  }