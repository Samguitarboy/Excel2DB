import axios from 'axios';

const API_URL = '/api';

/**
 * 登入使用者並獲取 JWT。
 * @param {Object} credentials - 包含 username 和 password 的物件。
 * @returns {Promise<String>} 返回 JWT token。
 * @throws {Error} 如果登入失敗，則拋出錯誤。
 */
export async function loginUser(credentials) {
  try {
    const response = await axios.post(`${API_URL}/login`, credentials);
    return response.data.token;
  } catch (err) {
    console.error('Login API request failed:', err);
    throw err;
  }
}

/**
 * 從後端 API 獲取 Excel 資料。
 * @returns {Promise<Array>} 返回包含資料陣列的 Promise。
 * @throws {Error} 如果 API 請求失敗，則拋出錯誤。
 */
export async function fetchExcelData() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found.');
    }
    const response = await axios.get(`${API_URL}/excel-data`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // 確保無論後端回傳的資料結構是 { data: [...] } 還是 [...]，都能正確處理
    return response.data.data || response.data;
  } catch (err) {
    console.error('API 請求失敗:', err);
    // 如果 token 失效或未授權，自動導向登入頁
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      localStorage.removeItem('token');
      window.location.hash = '/login';
    }
    throw new Error('無法載入資料。請確認您已登入或後端服務正在運行。');
  }
}
