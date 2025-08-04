import axios from 'axios';

const API_URL = '/api/excel-data';

/**
 * 從後端 API 獲取 Excel 資料。
 * @returns {Promise<Array>} 返回包含資料陣列的 Promise。
 * @throws {Error} 如果 API 請求失敗，則拋出錯誤。
 */
export async function fetchExcelData() {
  try {
    const response = await axios.get(API_URL);
    // 確保無論後端回傳的資料結構是 { data: [...] } 還是 [...]，都能正確處理
    return response.data.data || response.data;
  } catch (err) {
    console.error('API 請求失敗:', err);
    // 向上拋出一個更具體的錯誤訊息，讓呼叫者可以處理
    throw new Error('無法載入資料。請確認後端服務是否正在運行，且 API URL 是否正確。');
  }
}
