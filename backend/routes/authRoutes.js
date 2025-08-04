const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger'); // 引入日誌工具
const AppError = require('../utils/appError'); // 引入自定義錯誤類別

// 登入取得 JWT
router.post('/login', async (req, res, next) => {
  const { username, password } = req.body;
  logger.info(`Login attempt for username: ${username}`);
  
  try {
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, '../users.json'), 'utf-8')); // 使用 path.join
    const user = users.find((u) => u.username === username);

    if (user) {
      logger.info('User found. Comparing passwords...');
      const isMatch = await bcrypt.compare(password, user.password);
      logger.info(`Password match result: ${isMatch}`);
      if (isMatch) {
        const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, {
          expiresIn: '1h',
        });
        res.json({ token });
      } else {
        logger.warn(`Invalid credentials for user: ${username}`);
        return next(new AppError('Invalid credentials', 401));
      }
    } else {
      logger.warn(`User not found: ${username}`);
      return next(new AppError('Invalid credentials', 401));
    }
  } catch (error) {
    logger.error('❌ Error during login process:', error);
    return next(new AppError('Login failed due to server error.', 500));
  }
});

module.exports = router;
