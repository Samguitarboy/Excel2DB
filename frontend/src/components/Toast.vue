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
        <div class="toast-body">
          <div class="content-wrapper">
            {{ displayedMessage }}
          </div>
          <button 
            v-if="isContentLong" 
            @click="toggleExpand" 
            class="btn btn-link btn-sm text-white text-decoration-none p-0 mt-2"
          >
            {{ isExpanded ? '收合' : '顯示更多' }}
          </button>
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
import { Toast as BsToast } from 'bootstrap';

const props = defineProps({
  show: { type: Boolean, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'danger' }
});

const emit = defineEmits(['update:show']);

const toastElement = ref(null);
let toastInstance = null;

const isExpanded = ref(false);
const lineThreshold = 10;

const isContentLong = computed(() => {
  return props.message.split('\n').length > lineThreshold;
});

const displayedMessage = computed(() => {
  if (isContentLong.value && !isExpanded.value) {
    return props.message.split('\n').slice(0, lineThreshold).join('\n') + '...';
  }
  return props.message;
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

onMounted(() => {
  if (toastElement.value) {
    toastInstance = new BsToast(toastElement.value, { autohide: false });
    toastElement.value.addEventListener('hidden.bs.toast', () => {
      emit('update:show', false);
      isExpanded.value = false; // 關閉時重置展開狀態
    });
  }
});

watch(() => props.show, (newValue) => {
  if (newValue && toastInstance) {
    toastInstance.show();
  } else if (!newValue && toastInstance) {
    toastInstance.hide();
  }
});

watch(() => props.message, () => {
  isExpanded.value = false; // 新訊息來時重置
});

const toastClass = computed(() => ({
  'text-bg-danger': props.type === 'danger',
  'text-bg-success': props.type === 'success',
  'text-bg-warning': props.type === 'warning',
  'text-bg-info': props.type === 'info',
}));
</script>

<style scoped>
.toast-body {
  white-space: pre-wrap;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.content-wrapper {
  transition: max-height 0.3s ease-in-out;
  overflow: hidden;
}

.btn-link {
  align-self: flex-end;
}
</style>
