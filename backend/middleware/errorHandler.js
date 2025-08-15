const logger = require('../utils/logger');
const AppError = require('../utils/appError');

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // 操作性錯誤，發送給客戶端
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  // 程式或未知錯誤，不洩漏錯誤細節
  } else {
    logger.error('ERROR 💥', err); // 記錄錯誤
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'production') {
    // 在生產環境中，可以根據錯誤類型進行更細緻的處理
    // 例如，處理 Mongoose 錯誤、JWT 錯誤等
    let error = { ...err };
    error.message = err.message; // 確保 message 屬性被複製
    sendErrorProd(error, res);
  } else {
    // 預設情況或開發環境，發送詳細錯誤
    sendErrorDev(err, res);
  }
};
