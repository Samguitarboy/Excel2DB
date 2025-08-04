# Excel2DB 前端專案

這是一個使用 Vue 3 和 Vite 建置的前端應用程式，作為 Excel2DB 系統的使用者介面。它提供了一個安全、高效且使用者友善的方式來瀏覽和管理從後端導入的 Excel 資料。

---

## 主要功能

- **使用者認證**: 完整的登入、登出流程，並使用路由守衛保護需要授權的頁面。
- **動態資料表格**: 
  - **遠端資料獲取**: 從後端 API 非同步載入資料。
  - **客戶端排序**: 點擊欄位標頭即可對資料進行升序或降序排序。
  - **多條件篩選**: 提供多種篩選方式，包括：
    - 文字模糊搜尋
    - 特定欄位下拉選單篩選
    - 日期範圍篩選 (早於/晚於)
  - **分頁功能**: 包含每頁顯示數量切換、頁碼點擊、以及頁碼跳轉功能。
- **響應式設計 (RWD)**: 表格和分頁元件在手機等小螢幕裝置上會自動切換為更易於操作的垂直佈局。
- **使用者體驗優化**:
  - **全域載入指示器**: 在進行 API 請求時顯示全螢幕載入動畫，提供即時回饋。
  - **Toast 提示**: 用於顯示錯誤或提示訊息。
  - **詳細資料彈窗**: 以彈窗形式清晰地展示單筆資料的所有欄位。

---

## 技術棧

- **框架**: [Vue.js 3](https://vuejs.org/) (使用 Composition API)
- **建置工具**: [Vite](https://vitejs.dev/)
- **路由**: [Vue Router 4](https://router.vuejs.org/)
- **狀態管理**: [Pinia](https://pinia.vuejs.org/)
- **HTTP 客戶端**: [Axios](https://axios-http.com/) (使用攔截器統一處理認證、載入狀態和錯誤)
- **UI 框架**: [Bootstrap 5](https://getbootstrap.com/)
- **圖示**: [Bootstrap Icons](https://icons.getbootstrap.com/)

---

## 專案結構

```
src/
├── assets/         # 靜態資源 (圖片、樣式等)
├── components/     # 可重用的 Vue 元件 (如 DataTable, Pagination)
├── composables/    # 可重用的組合式函式 (如 useLoading)
├── router/         # 路由設定 (index.js)
├── services/       # API 服務層 (api.js)
├── stores/         # Pinia 狀態管理 (auth.js)
└── views/          # 頁面級元件 (Home.vue, Login.vue)
```

---

## 安裝與啟動

**環境要求**: [Node.js](https://nodejs.org/) (建議使用 LTS 版本)

1.  **安裝依賴**:
    在專案根目錄下執行指令，安裝所有必要的套件。
    ```bash
    npm install
    ```

2.  **啟動開發伺服器**:
    此指令會啟動一個支援熱重載的本地開發伺服器，通常在 `http://localhost:5173`。
    ```bash
    npm run dev
    ```

3.  **建置生產版本**:
    此指令會將專案打包到 `dist` 資料夾，包含壓縮和最佳化後的靜態檔案，可用於生產環境部署。
    ```bash
    npm run build
    ```

---

## API 代理設定

為了在開發環境中解決跨域問題 (CORS)，本專案在 `vite.config.js` 中設定了 API 代理。

所有前端發送到 `/api` 路徑的請求，都會被 Vite 開發伺服器轉發到 `http://localhost:3000` (預設的後端伺服器位址)。

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    }
  }
}
```
