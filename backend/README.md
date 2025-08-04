# 後端專案說明 (Backend Project Documentation)

這個目錄包含了 `Excel2DB` 專案的後端程式碼，主要負責處理資料的讀取、篩選、使用者認證以及檔案上傳等功能。

## 技術棧 (Tech Stack)

*   **Node.js**: 執行環境
*   **Express.js**: Web 應用程式框架
*   **Multer**: 處理檔案上傳
*   **ExcelJS**: 讀寫 Excel 檔案
*   **jsonwebtoken**: 實現 JWT (JSON Web Token) 認證
*   **bcryptjs**: 密碼雜湊與比對

## 專案結構 (Project Structure)

```
backend/
├── app.js              # 主要的後端應用程式檔案，包含所有路由和邏輯
├── auth.js             # JWT 認證中介軟體
├── package.json        # 專案依賴和腳本配置
├── package-lock.json   # 鎖定依賴版本
├── users.json          # 儲存使用者帳號和雜湊密碼的 JSON 檔案
├── uploads/            # 上傳的 Excel 檔案暫存目錄 (例如 test1.xlsx)
└── public/             # 靜態檔案目錄 (如果有的話)
```

## 環境變數 (Environment Variables)

請在專案根目錄下建立一個 `.env` 檔案，並設定以下環境變數：

```dotenv
PORT=3000
JWT_SECRET=your_jwt_secret_key_here # 請替換為一個強密鑰
```

*   `PORT`: 後端伺服器監聽的埠號，預設為 `3000`。
*   `JWT_SECRET`: 用於簽署和驗證 JWT 的密鑰。請務必使用一個複雜且安全的密鑰。

## 安裝與運行 (Installation and Running)

1.  **進入 `backend` 目錄**：

    ```bash
    cd backend
    ```

2.  **安裝依賴**：

    ```bash
    npm install
    ```

3.  **啟動伺服器**：

    ```bash
    node app.js
    ```

    伺服器啟動後，您將在控制台看到類似以下的訊息：

    ```
    🚀 Server running at http://localhost:3000
    ```

## API 說明 (API Endpoints)

### 公開 API (無需認證)

這些 API 供來賓模式使用，無需提供 JWT。

#### 1. 取得所有單位列表

*   **URL**: `/api/public/units`
*   **方法**: `GET`
*   **描述**: 從 `uploads/test1.xlsx` 檔案中讀取並回傳所有不重複的單位名稱列表。
*   **回應**: `Array<string>` - 包含單位名稱字串的陣列。

    ```json
    [
      "AAA",
      "BBB",
      "CCC"
    ]
    ```

#### 2. 取得特定單位的資料

*   **URL**: `/api/public/data`
*   **方法**: `GET`
*   **描述**: 根據查詢參數 `unit` 從 `uploads/test1.xlsx` 檔案中篩選並回傳相關資料。
*   **查詢參數**: 
    *   `unit` (string, **必填**): 要查詢的單位名稱 (例如 `AAA`, `BBB`)。
*   **回應**: `Array<Object>` - 包含篩選後資料的物件陣列。

    ```json
    [
      {
        "欄位1": "值1",
        "欄位2": "值2",
        "(自)所屬單位": "AAA"
      },
      // ... 更多資料
    ]
    ```

### 認證 API

#### 1. 使用者登入

*   **URL**: `/api/login`
*   **方法**: `POST`
*   **描述**: 使用者登入並取得 JWT (JSON Web Token)。
*   **請求體 (Request Body)**:

    ```json
    {
      "username": "your_username",
      "password": "your_password"
    }
    ```

*   **回應**: `Object` - 包含 JWT 的物件。

    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```

### 受保護的 API (需要 JWT 認證)

這些 API 需要在請求頭中包含有效的 JWT (格式為 `Authorization: Bearer <your_token>`)。

#### 1. 上傳 Excel 檔案

*   **URL**: `/upload`
*   **方法**: `POST`
*   **描述**: 上傳 Excel 檔案並解析其內容。解析結果會列印到後端控制台。
*   **請求類型**: `multipart/form-data`
*   **表單欄位**: 
    *   `file` (File, **必填**): 要上傳的 Excel 檔案。
*   **回應**: `string` - 成功訊息。

    ```
    ✅ 資料讀取完成，已列印於 console
    ```

#### 2. 取得所有 Excel 資料

*   **URL**: `/api/excel-data`
*   **方法**: `GET`
*   **描述**: 從 `uploads/test1.xlsx` 檔案中讀取並回傳所有資料。
*   **回應**: `Array<Object>` - 包含所有資料的物件陣列。

    ```json
    [
      {
        "欄位1": "值A",
        "欄位2": "值B",
        "(自)所屬單位": "AAA"
      },
      // ... 更多資料
    ]
    ```
