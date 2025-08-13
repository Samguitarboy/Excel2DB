const fsp = require('fs').promises;
const path = require('path');
const logger = require('./logger');

const filePath = path.join(__dirname, '..', 'applications.json');

/**
 * 讀取並解析 applications.json 檔案。
 * @returns {Promise<Array>} 一個解析為申請資料陣列的 Promise。
 */
async function readApplications() {
  try {
    const data = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 檔案不存在是正常情況，回傳空陣列。
      logger.info('applications.json not found, returning empty array.');
      return [];
    }
    if (error instanceof SyntaxError) {
      // 檔案損毀或為空。
      logger.warn('applications.json is corrupted or empty. Returning empty array.');
      return [];
    }
    // 對於其他未知的讀取錯誤，將其拋出，由全域錯誤處理器捕獲。
    throw error;
  }
}

/**
 * 將申請資料陣列寫入 applications.json 檔案。
 * @param {Array} data - 要寫入的申請資料陣列。
 * @returns {Promise<void>}
 */
async function writeApplications(data) {
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  readApplications,
  writeApplications,
};