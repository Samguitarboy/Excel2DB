<template>
  <Teleport to="body">
    <div
      class="modal fade"
      :class="{ show: show }"
      :style="{ display: show ? 'block' : 'none' }"
      tabindex="-1"
      role="dialog"
      @click.self="$emit('close')"
    >
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ mediaName }} 借用歷程記錄</h5>
            <button type="button" class="btn-close" @click="$emit('close')" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div v-if="history && history.length > 0" class="table-responsive">
              <table class="table table-striped table-hover">
                <thead class="thead-light">
                  <tr>
                    <th scope="col">借用人</th>
                    <th scope="col">借用事由</th>
                    <th scope="col">借用時間</th>
                    <th scope="col">歸還時間</th>
                    <th scope="col">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="record in history" :key="record.loanId">
                    <td>{{ record.borrower }}</td>
                    <td>{{ record.reason }}</td>
                    <td>{{ formatDate(record.loanDate) }}</td>
                    <td>{{ formatDate(record.returnDate) }}</td>
                    <td>
                      <span :class="getStatusClass(record.status)">
                        {{ translateStatus(record.status) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else>
              <p class="text-center">該可攜式儲存媒體未被借用過</p>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">關閉</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="show" class="modal-backdrop fade show"></div>
  </Teleport>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    required: true
  },
  history: {
    type: Array,
    default: () => []
  },
  mediaName: {
    type: String,
    default: ''
  }
});

defineEmits(['close']);

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const translateStatus = (status) => {
  if (status === 'borrowed') return '已借出';
  if (status === 'returned') return '已歸還';
  return status;
};

const getStatusClass = (status) => {
  return {
    'badge': true,
    'bg-warning': status === 'borrowed',
    'bg-success': status === 'returned',
    'text-dark': status === 'borrowed'
  };
};
</script>

<style scoped>
.modal-body {
  max-height: 70vh;
  overflow-y: auto;
}
.table {
  margin-bottom: 0;
}
</style>
