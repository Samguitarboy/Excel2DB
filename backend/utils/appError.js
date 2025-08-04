class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // 標記為操作性錯誤，表示是可預期的錯誤

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
