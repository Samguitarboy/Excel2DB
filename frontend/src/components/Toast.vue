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
import { Toast } from 'bootstrap';

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'danger' // 'success', 'warning', 'info', 'danger'
  }
});

const emit = defineEmits(['update:show']);

const toastElement = ref(null);
let toastInstance = null;

onMounted(() => {
  if (toastElement.value) {
    toastInstance = new Toast(toastElement.value, {
      autohide: true,
      delay: 3000
    });
    // 監聽 Bootstrap 的隱藏事件，以同步狀態回父元件
    toastElement.value.addEventListener('hidden.bs.toast', () => {
      emit('update:show', false);
    });
  }
});

watch(() => props.show, (newValue) => {
  if (newValue && toastInstance) {
    toastInstance.show();
  }
});

const toastClass = computed(() => ({
  'text-bg-danger': props.type === 'danger',
  'text-bg-success': props.type === 'success',
  'text-bg-warning': props.type === 'warning',
  'text-bg-info': props.type === 'info',
}));
</script>