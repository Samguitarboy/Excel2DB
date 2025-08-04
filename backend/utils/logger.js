const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, align } = format;

// 自定義日誌格式
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}] ${message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug', // 生產環境只記錄 info 及以上，開發環境記錄 debug 及以上
  format: combine(
    colorize({ all: true }), // 讓日誌在控制台顯示顏色
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // 時間戳格式
    align(), // 對齊日誌訊息
    logFormat
  ),
  transports: [
    new transports.Console(), // 輸出到控制台
    // 可以在這裡添加其他傳輸器，例如輸出到檔案：
    // new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new transports.File({ filename: 'logs/combined.log' }),
  ],
});

module.exports = logger;
