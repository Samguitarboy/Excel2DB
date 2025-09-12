<template>
  <div class="modal-backdrop" @click.self="closeModal">
    <div class="modal-content shadow">
      <h4 class="modal-title">加密隨身碟 - 使用注意事項</h4>
      <div class="pdf-body">
        <iframe :src="pdfPath" width="100%" height="100%"></iframe>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeModal">
          關閉
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>

const props = defineProps({
  pdfPath: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['close']);

const closeModal = () => {
  emit('close');
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
}
.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 800px; /* Increased width for better PDF viewing */
  height: 90vh; /* Increased height */
  display: flex;
  flex-direction: column;
}
.modal-title {
  margin-bottom: 1rem;
  text-align: center;
}
.pdf-body {
  flex-grow: 1; /* Allow iframe to fill available space */
  border: 1px solid #ccc;
}
.pdf-body iframe {
  border: none;
}
.modal-footer {
  margin-top: 1rem;
  text-align: right;
}
</style>
