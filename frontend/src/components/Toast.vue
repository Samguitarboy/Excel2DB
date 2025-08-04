<template>
  <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1100">
    <div
      ref="toastElement"
      class="toast align-items-center border-0"
      :class="toastClass"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div class="d-flex">
        <div class="toast-body" style="white-space: pre-wrap;"> <!-- 添加 style 屬性 -->
          {{ message }}
        </div>
        <button 
          type="button" 
          class="btn-close btn-close-white me-2 m-auto" 
          data-bs-dismiss="toast" 
          aria-label="Close"
        ></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { Toast as BsToast } from 'bootstrap'; // 重新命名以避免與元件本身名稱衝突

// --- Props ---
const props = defineProps({
  // 控制 Toast 的顯示與隱藏 (v-model)
  show: { type: Boolean, required: true },
  // 要顯示的訊息
  message: { type: String, required: true },
  // Toast 的類型，用於決定背景顏色
  type: { type: String, default: 'danger' } // 可選: 'success', 'warning', 'info', 'danger'
});

// --- Emits ---
const emit = defineEmits(['update:show']); // 用於 v-model

// --- State ---
const toastElement = ref(null); // 模板引用，指向 Toast 的 DOM 元素
let toastInstance = null;      // 儲存 Bootstrap Toast 的實例

// --- Lifecycle Hook ---
onMounted(() => {
  if (toastElement.value) {
    // 初始化 Bootstrap Toast 實例
    toastInstance = new BsToast(toastElement.value, {
      autohide: false, // 禁用自動隱藏
      // delay: 3000     // 移除 delay 選項
    });

    // 監聽 Bootstrap 原生的隱藏事件
    // 當 Toast (無論是自動還是手動關閉) 完成隱藏動畫後，
    // 觸發 update:show 事件，將 show 狀態同步回父元件。
    // 這是確保 Vue 狀態與 DOM 狀態一致的關鍵。
    toastElement.value.addEventListener('hidden.bs.toast', () => {
      emit('update:show', false);
    });
  }
});

// --- Watcher ---
// 監聽父元件傳入的 show 屬性
watch(() => props.show, (newValue) => {
  // 當 show 變為 true 時，呼叫 Bootstrap Toast 實例的 show() 方法來顯示它
  if (newValue && toastInstance) {
    toastInstance.show();
  }
});

// --- Computed Property ---
// 根據傳入的 type 屬性，動態計算背景顏色的 class
const toastClass = computed(() => ({
  'text-bg-danger': props.type === 'danger',
  'text-bg-success': props.type === 'success',
  'text-bg-warning': props.type === 'warning',
  'text-bg-info': props.type === 'info',
}));
</script>