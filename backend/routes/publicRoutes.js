const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // 引入日誌工具
const AppError = require('../utils/appError'); // 引入自定義錯誤類別

// 取得所有單位（無需 JWT 驗證）
router.get('/units', async (req, res, next) => {
  if (!req.app.locals.cachedExcelData) { // 從 app.locals 獲取 cachedExcelData
    return next(new AppError('Excel data not loaded.', 500));
  }

  try {
    const departments = new Set();
    req.app.locals.cachedExcelData.forEach(row => {
      const department = row['(自)所屬單位'];
      if (department) {
        departments.add(department.toString().trim());
      }
    });
    res.json([...departments]);
  } catch (error) {
    logger.error('❌ Error processing units from cached data:', error);
    next(new AppError('Error fetching units from cached data', 500));
  }
});

// 取得特定單位的 Excel 資料（無需 JWT 驗證）
router.get('/data', async (req, res, next) => {
  if (!req.app.locals.cachedExcelData) {
    return next(new AppError('Excel data not loaded.', 500));
  }
  const unitFilter = req.query.unit;

  try {
    const filteredRows = req.app.locals.cachedExcelData.filter(row => {
      return !unitFilter || (row['(自)所屬單位'] && row['(自)所屬單位'].toString().trim() === unitFilter.toString().trim());
    });
    res.json(filteredRows);
  } catch (error) {
    logger.error('❌ Error processing filtered data from cached data:', error);
    next(new AppError('Error fetching filtered data from cached data', 500));
  }
});

// 取得特定多個單位的 Excel 資料（無需 JWT 驗證）
router.post('/data-by-units', async (req, res, next) => {
  if (!req.app.locals.cachedExcelData) {
    return next(new AppError('Excel data not loaded.', 500));
  }
  const { units } = req.body;

  if (!Array.isArray(units)) {
    return next(new AppError('Invalid input: units must be an array.', 400));
  }

  try {
    const unitSet = new Set(units.map(u => u.toString().trim()));
    const filteredRows = req.app.locals.cachedExcelData.filter(row => {
      return row['(自)所屬單位'] && unitSet.has(row['(自)所屬單位'].toString().trim());
    });
    res.json(filteredRows);
  } catch (error) {
    logger.error('❌ Error processing filtered data from cached data for multiple units:', error);
    next(new AppError('Error fetching filtered data from cached data', 500));
  }
});

// 取得分類為「隨身碟」的保管人、單位管控窗口及資產名稱列表（無需 JWT 驗證）
router.get('/usb-contacts', async (req, res, next) => {
  if (!req.app.locals.cachedExcelData) {
    return next(new AppError('Excel data not loaded.', 500));
  }

  try {
    const custodians = new Set();
    const contactPersons = new Set();
    const assetNames = new Set();

    req.app.locals.cachedExcelData.forEach(row => {
      if (row['(自)分類'] && row['(自)分類'].toString().trim() === '隨身碟') {
        if (row['保管人']) {
          custodians.add(row['保管人'].toString().trim());
        }
        if (row['(自)單位管控窗口']) {
          contactPersons.add(row['(自)單位管控窗口'].toString().trim());
        }
        if (row['資產名稱']) {
          assetNames.add(row['資產名稱'].toString().trim());
        }
      }
    });
    res.json({ custodians: [...custodians], contactPersons: [...contactPersons], assetNames: [...assetNames] });
  } catch (error) {
    logger.error('❌ Error processing USB contacts from cached data:', error);
    next(new AppError('Error fetching USB contacts from cached data', 500));
  }
});

module.exports = router;