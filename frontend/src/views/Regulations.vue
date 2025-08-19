<template>
  <div class="bg-light min-vh-100">
    <div class="container p-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="h3 mb-0">請詳閱以下規定：</h1>
        <router-link to="/login" class="btn btn-primary">
          返回登入頁
        </router-link>
      </div>

      <div class="row">
        <!-- Left PDF Card -->
        <div class="col-md-6 mb-4">
          <div class="card h-100 shadow-sm">
            <div class="card-body d-flex flex-column">
              <h2 class="card-title h5 mb-3">中央印製廠-可攜式資訊設備及儲存媒體安全管理須知</h2>
              <div class="flex-grow-1">
                <object data="pdfs/regulation1.pdf" type="application/pdf" width="100%" height="730px">
                  <p class="text-muted">您的瀏覽器不支援 PDF 嵌入，請點擊 <a href="pdfs/regulation1.pdf">這裡</a> 下載檔案。</p>
                </object>
              </div>
            </div>
          </div>
        </div>

        <!-- Right PDF Card -->
        <div class="col-md-6 mb-4">
          <div class="card h-100 shadow-sm">
            <div class="card-body d-flex flex-column">
              <h2 class="card-title h5 mb-3">中央印製廠-可攜式儲存媒體管制說明</h2>
              <div class="flex-grow-1">
                <object data="pdfs/regulation2.pdf" type="application/pdf" width="100%" height="730px">
                  <p class="text-muted">您的瀏覽器不支援 PDF 嵌入，請點擊 <a href="pdfs/regulation2.pdf">這裡</a> 下載檔案。</p>
                </object>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// This page is for displaying regulations from PDF files.
</script>

<style scoped>
/* Add any specific styles for this page if needed */
</style>
