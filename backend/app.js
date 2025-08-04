require('dotenv').config(); // 載入 .env 檔案中的環境變數
const express = require('express'); // 引入 Express 框架
const multer = require('multer'); // 引入 Multer 用於處理檔案上傳
const jwt = require('jsonwebtoken'); // 引入 jsonwebtoken 用於 JWT 認證
const bcrypt = require('bcryptjs'); // 引入 bcryptjs 用於密碼雜湊比較
const fs = require('fs'); // 引入 Node.js 內建的檔案系統模組
const path = require('path'); // 引入 Node.js 內建的路徑模組
const ExcelJS = require('exceljs'); // 引入 ExcelJS 用於讀寫 Excel 檔案
const { authenticateJWT } = require('./auth'); // 引入自定義的 JWT 認證中介軟體

const app = express(); // 創建 Express 應用程式實例
const port = process.env.PORT || 3000; // 設定伺服器監聽的埠號，預設為 3000

// --- 中介軟體 (Middleware) ---
app.use(express.json()); // 解析 JSON 格式的請求體
app.use(express.urlencoded({ extended: true })); // 解析 URL-encoded 格式的請求體
app.use(express.static('public')); // 設定靜態檔案服務，將 'public' 目錄下的檔案公開

// 設定 Multer 儲存上傳檔案的目的地
const upload = multer({ dest: 'uploads/' });

// --- 公開 API 路由 (無需 JWT 驗證) ---

/**
 * @route GET /api/public/units
 * @description 取得 Excel 檔案中所有不重複的單位列表。
 *              此 API 無需認證，供來賓模式使用。
 * @returns {Array<string>} 包含單位名稱字串的陣列。
 * @response 200 - 成功取得單位列表
 * @response 404 - Excel 檔案未找到
 * @response 500 - 讀取 Excel 檔案時發生錯誤
 */
app.get('/api/public/units', async (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'test1.xlsx'); // Excel 檔案路徑

  try {
    // 檢查 Excel 檔案是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Excel file not found.');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath); // 讀取 Excel 檔案
    const worksheet = workbook.getWorksheet(1); // 取得第一個工作表

    const departments = new Set(); // 使用 Set 儲存不重複的單位名稱
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳過標題列 (第一行)
      // 假設 '(自)所屬單位' 是 Excel 中的第 4 列 (索引為 3)
      const department = row.getCell(4).value;
      if (department) {
        departments.add(department.toString().trim()); // 將單位名稱加入 Set
      }
    });

    res.json([...departments]); // 將 Set 轉換為陣列並回傳
  } catch (error) {
    console.error('❌ Error reading Excel file for units:', error);
    res.status(500).send('Error fetching units from Excel file');
  }
});

/**
 * @route GET /api/public/data
 * @description 根據指定的單位名稱，從 Excel 檔案中篩選並取得相關資料。
 *              此 API 無需認證，供來賓模式使用。
 * @param {string} req.query.unit - 要查詢的單位名稱。
 * @returns {Array<Object>} 包含篩選後資料的物件陣列。
 * @response 200 - 成功取得篩選後的資料
 * @response 404 - Excel 檔案未找到
 * @response 500 - 讀取或篩選 Excel 檔案時發生錯誤
 */
app.get('/api/public/data', async (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'test1.xlsx'); // Excel 檔案路徑
  const unitFilter = req.query.unit; // 從查詢參數獲取單位名稱

  try {
    // 檢查 Excel 檔案是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Excel file not found.');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath); // 讀取 Excel 檔案
    const worksheet = workbook.getWorksheet(1); // 取得第一個工作表

    const filteredRows = []; // 儲存篩選後的資料
    const headers = []; // 儲存 Excel 標題列
    // 讀取第一行作為標題
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
      headers.push(cell.value);
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳過標題列
      const rowData = {};
      // 將每一行的資料與標題對應，建立物件
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowData[headers[colNumber - 1]] = cell.value;
      });

      // 根據單位名稱進行篩選
      // 假設 '(自)所屬單位' 是 Excel 中的一個欄位名稱
      if (!unitFilter || (rowData['(自)所屬單位'] && rowData['(自)所屬單位'].toString().trim() === unitFilter.toString().trim())) {
        filteredRows.push(rowData);
      }
    });

    res.json(filteredRows); // 回傳篩選後的資料
  } catch (error) {
    console.error('❌ Error reading Excel file for filtered data:', error);
    res.status(500).send('Error fetching filtered data from Excel file');
  }
});

// --- 認證相關 API 路由 ---

/**
 * @route POST /api/login
 * @description 使用者登入並取得 JWT (JSON Web Token)。
 * @param {string} req.body.username - 使用者名稱。
 * @param {string} req.body.password - 密碼。
 * @returns {Object} 包含 JWT 的物件。
 * @response 200 - 成功登入，回傳 token
 * @response 401 - 無效的憑證 (使用者名稱或密碼錯誤)
 */
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt for username: ${username}`); // 記錄登入嘗試的使用者名稱

  // 從 users.json 讀取使用者資料
  const users = JSON.parse(fs.readFileSync('users.json', 'utf-8'));
  const user = users.find((u) => u.username === username); // 查找使用者

  if (user) {
    console.log('User found. Comparing passwords...');
    // 比較傳入的密碼與儲存的雜湊密碼
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`Password match result: ${isMatch}`); // 記錄密碼比對結果

    if (isMatch) {
      // 如果密碼匹配，生成 JWT
      const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, {
        expiresIn: '1h', // token 有效期限為 1 小時
      });
      res.json({ token }); // 回傳 token
    } else {
      res.status(401).send('Invalid credentials'); // 密碼不匹配
    }
  } else {
    console.log('User not found.');
    res.status(401).send('Invalid credentials'); // 使用者不存在
  }
});

// --- 受保護的 API 路由 (需要 JWT 驗證) ---

/**
 * @route POST /upload
 * @description 上傳 Excel 檔案並解析其內容。
 *              此 API 需要 JWT 認證。
 * @param {File} req.file - 上傳的 Excel 檔案。
 * @returns {string} 成功訊息。
 * @response 200 - 成功讀取並處理 Excel 檔案
 * @response 401 - 未授權 (JWT 無效或缺失)
 * @response 500 - 讀取或處理 Excel 檔案時發生錯誤
 */
app.post('/upload', authenticateJWT, upload.single('file'), async (req, res) => {
  const filePath = req.file.path; // 取得上傳檔案的暫存路徑
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath); // 讀取 Excel 檔案
    const worksheet = workbook.getWorksheet(1); // 取得第一個工作表

    const rows = []; // 儲存解析後的資料
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳過標題列
      // 根據 Excel 列的順序解析資料，並進行清理
      const [Category, AssetNumber, AssetName, Department, Custodian, ContactPerson, Remark, Status, LastAccessTime] = row.values.slice(1);
      rows.push({
        Category: Category?.toString().trim() || '',
        AssetNumber: AssetNumber?.toString().trim() || '',
        AssetName: AssetName?.toString().trim() || '',
        Department: Department?.toString().trim() || '',
        Custodian: Custodian?.toString().trim() || '',
        ContactPerson: ContactPerson?.toString().trim() || '',
        Remark: Remark?.toString().trim() || '',
        Status: Status?.toString().trim() || '',
        LastAccrssTime: LastAccessTime ? new Date(LastAccessTime) : null,
      });
    });
    console.log('📄 Excel 匯入結果：');
    console.table(rows); // 在控制台以表格形式顯示解析結果
    res.send('✅ 資料讀取完成，已列印於 console');
  } catch (error) {
    console.error('❌ Excel 讀取失敗:', error);
    res.status(500).send('讀取失敗');
  } finally {
    fs.unlinkSync(filePath); // 無論成功或失敗，都刪除上傳的暫存檔案
  }
});

/**
 * @route GET /api/excel-data
 * @description 取得 Excel 檔案中的所有資料。
 *              此 API 需要 JWT 認證。
 * @returns {Array<Object>} 包含所有資料的物件陣列。
 * @response 200 - 成功取得所有 Excel 資料
 * @response 401 - 未授權 (JWT 無效或缺失)
 * @response 404 - Excel 檔案未找到
 * @response 500 - 讀取 Excel 檔案時發生錯誤
 */
app.get('/api/excel-data', authenticateJWT, async (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'test1.xlsx'); // Excel 檔案路徑

  try {
    // 檢查 Excel 檔案是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Excel file not found.');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath); // 讀取 Excel 檔案
    const worksheet = workbook.getWorksheet(1); // 取得第一個工作表

    const rows = []; // 儲存所有資料
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳過標題列
      const rowData = {};
      // 將每一行的資料與標題對應，建立物件
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // 使用第一列的標頭作為 JSON 的鍵
        const headerCell = worksheet.getRow(1).getCell(colNumber);
        rowData[headerCell.value] = cell.value;
      });
      rows.push(rowData);
    });

    res.json(rows); // 回傳所有資料
  } catch (error) {
    console.error('❌ Error reading Excel file:', error);
    res.status(500).send('Error reading Excel file');
  }
});

// --- 啟動伺服器 ---
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});