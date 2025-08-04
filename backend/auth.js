const jwt = require('jsonwebtoken'); // 引入 jsonwebtoken 模組，用於處理 JWT

/**
 * JWT 認證中介軟體
 * 檢查請求頭中的 Authorization 欄位，驗證 JWT 的有效性。
 * 如果 JWT 有效，則將解碼後的使用者資訊附加到 req.user 上，並呼叫 next() 繼續處理請求。
 * 如果 JWT 無效或缺失，則回傳 401 (Unauthorized) 或 403 (Forbidden) 狀態碼。
 * @param {Object} req - Express 請求物件
 * @param {Object} res - Express 回應物件
 * @param {Function} next - Express 下一個中介軟體函式
 */
function authenticateJWT(req, res, next) {
  // 從請求頭中獲取 Authorization 欄位
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // 從 'Bearer <token>' 格式中提取 token
    const token = authHeader.split(' ')[1];

    // 驗證 token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        // 如果 token 無效 (例如過期、簽名不正確)，回傳 403 Forbidden
        return res.sendStatus(403); 
      }
      // 如果 token 有效，將解碼後的使用者資訊儲存到 req.user
      req.user = user;
      // 繼續處理下一個中介軟體或路由處理器
      next();
    });
  } else {
    // 如果請求頭中沒有 Authorization 欄位，回傳 401 Unauthorized
    res.sendStatus(401); 
  }
}

// 導出 authenticateJWT 函式，供其他模組使用
module.exports = { authenticateJWT };