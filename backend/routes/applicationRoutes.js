const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // 引入日誌工具
const AppError = require('../utils/appError'); // 引入自定義錯誤類別

// 接收可攜式儲存媒體申請表單的資料
router.post('/', async (req, res, next) => {
  try {
    const applicationData = req.body;
    logger.info('📝 Received new application:', applicationData);
    // 在這裡可以將資料儲存到資料庫或檔案中
    res.status(200).json({ message: '申請已成功接收！' });
  } catch (error) {
    logger.error('❌ Error processing application:', error);
    next(new AppError('處理申請時發生錯誤。', 500));
  }
});

module.exports = router;
