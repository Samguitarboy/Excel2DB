const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const logDir = 'logs'; // 存放日誌的目錄

// 自定義日誌格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(info => {
    const { timestamp, level, message, ...meta } = info;
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length) {
      // 如果有額外的 meta 資料，將其轉換為 JSON 字串
      logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return logMessage;
  })
);

// 建立一個每日輪替的檔案 transport
const fileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true, // 壓縮舊的日誌檔
  maxSize: '20m',      // 每個日誌檔最大 20MB
  maxFiles: '14d',     // 最多保留 14 天的日誌
  format: logFormat,
});

// 建立一個 console transport
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(), // 為 console 輸出加上顏色
    logFormat
  ),
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports: [
    consoleTransport,
    fileTransport,
  ],
});

module.exports = logger;
