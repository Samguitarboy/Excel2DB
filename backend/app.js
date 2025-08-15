require('dotenv').config(); // 載入 .env 檔案中的環境變數
const express = require('express'); // 引入 Express 框架
const fs = require('fs'); // 引入 Node.js 內建的檔案系統模組
const path = require('path'); // 引入 Node.js 內建的路徑模組
const ExcelJS = require('exceljs'); // 引入 ExcelJS 用於讀寫 Excel 檔案
const logger = require('./utils/logger'); // 引入日誌工具
const AppError = require('./utils/appError'); // 引入自定義錯誤類別
const globalErrorHandler = require('./middleware/errorHandler'); // 引入全域錯誤處理中介軟體

// 引入路由模組
const publicRoutes = require('./routes/publicRoutes');
const authRoutes = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express(); // 創建 Express 應用程式實例
app.set('trust proxy', 1); // 信任一層反向代理，這樣 req.ip 才能正確獲取用戶的真實 IP
const port = process.env.PORT; // 設定伺服器監聽的埠號，預設為 3000

// --- 中介軟體 (Middleware) ---
app.use(express.json()); // 解析 JSON 格式的請求體
app.use(express.urlencoded({ extended: true })); // 解析 URL-encoded 格式的請求體
app.use(express.static('public')); // 設定靜態檔案服務，將 'public' 目錄下的檔案公開

// --- Excel 資料快取 ---
let cachedExcelData = null; // 用於儲存解析後的 Excel 資料

/**
 * 載入並解析 Excel 檔案到記憶體中。
 * @returns {Array<Object>} 解析後的 Excel 資料陣列。
 */
async function loadExcelData() {
  const filePath = path.join(__dirname, 'uploads', 'test1.xlsx');
  if (!fs.existsSync(filePath)) {
    logger.error(`❌ Excel file not found at: ${filePath}`);
    throw new AppError(`Excel file not found at: ${filePath}`, 404); // 拋出 AppError
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    const rows = [];
    const headers = [];
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
      headers.push(cell.value);
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳過標題列
      const rowData = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowData[headers[colNumber - 1]] = cell.value;
      });
      rows.push(rowData);
    });
    logger.info('✅ Excel data loaded into memory.');
    return rows;
  } catch (error) {
    logger.error('❌ Error loading Excel data:', error);
    throw new AppError('Error loading Excel data', 500); // 拋出 AppError
  }
}

// 在伺服器啟動時載入 Excel 資料
(async () => {
  try {
    cachedExcelData = await loadExcelData();
    // 將 cachedExcelData 附加到 app.locals，以便在路由中訪問
    app.locals.cachedExcelData = cachedExcelData;
  } catch (err) {
    logger.error('Server startup failed due to Excel data loading error:', err.message);
    process.exit(1); // 退出應用程式，因為核心資料無法載入
  }
})();

// --- 使用路由模組 ---
app.use('/api/public', publicRoutes); // 公開 API 路由
app.use('/api', authRoutes); // 認證相關 API 路由 (例如 /api/login)
app.use('/api/applications', applicationRoutes); // 申請相關 API 路由
app.use('/api', adminRoutes); // 管理相關 API 路由 (例如 /api/upload, /api/excel-data)

// 處理所有未匹配的路由
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 全域錯誤處理中介軟體
app.use(globalErrorHandler);

// --- 啟動伺服器 ---
app.listen(port, () => {
  logger.info(`🚀 Server running at http://localhost:${port}`);
});