<template>
  <!-- 
    Teleport 是一個內建元件，可以將其插槽內容「傳送」到 DOM 中的另一個位置。
    這裡我們將整個 modal 傳送到 body 標籤下，以避免父元件的 CSS (如 z-index) 影響其顯示。
  -->
  <Teleport to="body">
    <!-- 點擊背景遮罩時觸發關閉事件 -->
    <div
      class="modal fade"
      :class="{ show: show }"
      :style="{ display: show ? 'block' : 'none' }"
      tabindex="-1"
      role="dialog"
      @click.self="$emit('close')" 
    >
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">資料詳情</h5>
            <button type="button" class="btn-close" @click="$emit('close')" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div v-if="rowData" class="details-grid">
              <!-- 遍歷傳入的 rowData 物件，顯示所有鍵值對 -->
              <template v-for="(value, key) in rowData" :key="key">
                <div class="detail-key">{{ key }}</div>
                <div class="detail-value">
                  <!-- 對特定欄位進行格式化 -->
                  <template v-if="key === '最後存取時間' && value">
                    {{ new Date(value).toLocaleString() }}
                  </template>
                  <template v-else-if="key === '最後存取時間' && !value">
                    已過一年以上沒有使用
                  </template>
                  <template v-else>
                    {{ value !== null && value !== undefined ? value : 'N/A' }}
                  </template>
                </div>
              </template>
            </div>
            <div v-else>
              <p>沒有可顯示的資料。</p>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">關閉</button>
          </div>
        </div>
      </div>
    </div>
    <!-- 手動控制背景遮罩的顯示，因為我們沒有使用 Bootstrap 的 JavaScript -->
    <div v-if="show" class="modal-backdrop fade show"></div>
  </Teleport>
</template>

<script setup>
defineProps({
  // 控制 modal 的顯示與隱藏
  show: {
    type: Boolean,
    required: true
  },
  // 要顯示的行資料物件
  rowData: {
    type: Object,
    default: () => ({})
  }
});

defineEmits(['close']); // 定義關閉事件
</script>

<style scoped>
.details-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px 20px;
  max-height: 60vh;
  overflow-y: auto;
}
.detail-key {
  font-weight: bold;
  text-align: right;
  color: #495057;
  word-break: keep-all;
}
.detail-value {
  word-break: break-all;
}
</style>