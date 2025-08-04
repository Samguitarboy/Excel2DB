const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { authenticateJWT } = require('../auth'); // 引入認證中介軟體
const logger = require('../utils/logger'); // 引入日誌工具
const AppError = require('../utils/appError'); // 引入自定義錯誤類別

const upload = multer({ dest: 'uploads/' });

// Excel 上傳（需 JWT 驗證）
router.post('/upload', authenticateJWT, upload.single('file'), async (req, res, next) => {
  const filePath = req.file.path;
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
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
    logger.info('📄 Excel 匯入結果：');
    logger.info(rows); // 使用 logger.info 記錄表格數據
    res.json({ message: '✅ 資料讀取完成，已列印於 console' }); // 回傳 JSON 格式
  } catch (error) {
    logger.error('❌ Excel 讀取失敗:', error);
    next(new AppError('讀取失敗', 500));
  } finally {
    fs.unlinkSync(filePath);
  }
});

// 取得 Excel 資料（需 JWT 驗證）
router.get('/excel-data', authenticateJWT, async (req, res, next) => {
  if (!req.app.locals.cachedExcelData) {
    return next(new AppError('Excel data not loaded.', 500));
  }
  res.json(req.app.locals.cachedExcelData);
});

module.exports = router;
