const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // 引入日誌工具
const AppError = require('../utils/appError'); // 引入自定義錯誤類別
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

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

// 取得所有借用紀錄 (可選用 mediaPropertyNumber 篩選)
router.get('/loans', async (req, res, next) => {
  const loansFilePath = path.join(__dirname, '../', 'loans.json');
  try {
    const data = await fs.readFile(loansFilePath, 'utf8');
    const loans = JSON.parse(data);

    const { mediaPropertyNumber } = req.query;

    if (mediaPropertyNumber) {
      const filteredLoans = loans.filter(loan => loan.mediaPropertyNumber === mediaPropertyNumber);
      // 將結果按借用日期降序排序 (最新的在前面)
      filteredLoans.sort((a, b) => new Date(b.loanDate) - new Date(a.loanDate));
      res.json(filteredLoans);
    } else {
      // 將結果按借用日期降序排序 (最新的在前面)
      loans.sort((a, b) => new Date(b.loanDate) - new Date(a.loanDate));
      res.json(loans);
    }
  } catch (err) {
    // 如果 loans.json 不存在，代表還沒有任何借用記錄，回傳空陣列是正常行為
    if (err.code === 'ENOENT') {
      return res.json([]);
    }
    // 其他錯誤則交由全域錯誤處理器
    logger.error('Error reading loan data:', err);
    next(new AppError('讀取借用資料時發生錯誤', 500));
  }
});

// 提交新的媒體借用申請
router.post('/loans', async (req, res, next) => {
  const { borrower, expectedReturnDate, reason, mediaPropertyNumbers, unit } = req.body;

  if (!borrower || !expectedReturnDate || !reason || !Array.isArray(mediaPropertyNumbers) || mediaPropertyNumbers.length === 0) {
    return next(new AppError('缺少必要的借用資訊', 400));
  }

  const loansFilePath = path.join(__dirname, '../', 'loans.json');

  try {
    // 讀取現有的借用紀錄
    let loans = [];
    try {
      const data = await fs.readFile(loansFilePath, 'utf8');
      loans = JSON.parse(data);
    } catch (readError) {
      // 如果檔案不存在或為空，這不是一個致命錯誤，我們將從一個空陣列開始
      if (readError.code !== 'ENOENT') {
        throw new AppError('無法讀取借用紀錄檔案', 500);
      }
    }

    const sourceIp = req.ip;

    const newLoans = mediaPropertyNumbers.map(mediaId => ({
      loanId: crypto.randomUUID(),
      mediaPropertyNumber: mediaId,
      borrower,
      reason,
      unit,
      loanDate: new Date().toISOString(),
      expectedReturnDate,
      returnDate: null,
      status: 'borrowed',
      sourceIp,
    }));

    // 將新的紀錄添加到現有紀錄中
    const updatedLoans = [...loans, ...newLoans];

    // 將更新後的紀錄寫回檔案
    await fs.writeFile(loansFilePath, JSON.stringify(updatedLoans, null, 2), 'utf8');

    logger.info(`✅ ${newLoans.length} new loan(s) created by ${borrower} from ${unit} (IP: ${sourceIp})`);
    res.status(201).json({
      status: 'success',
      message: '借用申請已成功紀錄',
      data: newLoans,
    });

  } catch (error) {
    logger.error('❌ Error creating new loan(s):', error);
    next(new AppError('建立借用紀錄時發生錯誤', 500));
  }
});

// 歸還一個媒體
router.patch('/loans/:loanId/return', async (req, res, next) => {
  const { loanId } = req.params;
  const loansFilePath = path.join(__dirname, '../', 'loans.json');

  try {
    let loans = [];
    try {
      const data = await fs.readFile(loansFilePath, 'utf8');
      loans = JSON.parse(data);
    } catch (readError) {
      if (readError.code === 'ENOENT') {
        return next(new AppError('借用紀錄檔案不存在', 404));
      }
      throw readError; // 拋出其他讀取錯誤
    }

    const loanIndex = loans.findIndex(l => l.loanId === loanId);

    if (loanIndex === -1) {
      return next(new AppError('找不到指定的借用紀錄', 404));
    }

    if (loans[loanIndex].status === 'returned') {
      return next(new AppError('此項目先前已被歸還', 400));
    }

    // 更新紀錄
    loans[loanIndex].status = 'returned';
    loans[loanIndex].returnDate = new Date().toISOString();

    // 寫回檔案
    await fs.writeFile(loansFilePath, JSON.stringify(loans, null, 2), 'utf8');

    logger.info(`✅ Loan ${loanId} has been returned.`);
    res.status(200).json({
      status: 'success',
      message: '歸還成功',
      data: loans[loanIndex],
    });

  } catch (error) {
    logger.error(`❌ Error returning loan ${loanId}:`, error);
    next(new AppError('歸還處理時發生錯誤', 500));
  }
});

module.exports = router;
