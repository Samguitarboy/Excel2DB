<template>
  <div class="modal-backdrop">
    <div class="modal-content shadow">
      <h4 class="modal-title">公告</h4>
      <div class="announcement-body" @scroll="handleScroll" ref="announcementBody">
        <p><strong>最後更新日期：2025年8月7日</strong></p>
        <div class="note"><p>在您使用本網站之前，請仔細閱讀以下資訊。<br>使用後，即表示您已閱讀、了解並同意接受本公告之所有內容。</p></div>
        <p><br>「可攜式儲存媒體」係指任何由本廠資訊室統一控管，派發予因公務上有資料儲存及傳遞需求之單位或個人，具備「資料儲存能力」且「可隨身攜帶」的硬體設備。包括但不限於外接式硬碟、抽取式硬碟，外接式燒錄機、隨身碟、磁帶、磁片、記憶卡、光碟片等。</p>
        <h5><br><strong>為避免公務資料外洩及確保資訊安全，<br>使用可攜式儲存媒體時，請務必確實遵守以下事項：</strong></h5>
        <h5><br>一、發放規則</h5>
        <p>原則上，行政單位各組配置一支隨身碟，工廠各股與廠長室亦同。<br>惟有特殊需求，須於申請單上敘明理由，經資訊室評估後予以發放。<br>倘若連續一個月以上無使用紀錄者，資訊室會提醒填寫歸還單，<br>建議有需求時再向資訊室登記借用。<br>(內部電腦間傳輸資料，請優先考慮廠內「公務網路儲存空間」)</p>        
        <h5><br>二、使用者責任</h5>
        <p>可攜式儲存媒體之保管人應妥善做好安全保管工作。</p>
        <p class="important"><strong>如發生「遺失」之情事，保管人將依廠規議處。</strong></p>
        <h5><br>三、資料保全</h5>
        <p>如需透過可攜式儲存媒體傳輸資料時，<br>應予以加密，並於使用完畢後進行刪除。<br>(若有資料備存需求請參考廠內「公務網路儲存空間」)</p>
        <h5><br>四、稽核作業</h5>
        <p>政風室會協同資訊室組成內部稽核小組，<br>定期針對本廠各單位可攜式儲存媒體進行盤點檢查。<br></p>
        
        <!-- 滾動提示 -->
        <p v-if="showScrollHint" class="scroll-hint">
          <strong>請您閱讀並滾動到末尾，下方的按鈕才能點擊繼續...</strong>
        </p>
      </div>
      <div class="modal-footer">
        <button 
          class="btn btn-primary" 
          @click="closeModal" 
          :disabled="isButtonDisabled"
        >
          我已閱讀並同意
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['close']);
const isButtonDisabled = ref(true);
const showScrollHint = ref(true);
const announcementBody = ref(null);

const handleScroll = (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target;
  // 增加一個小的容錯值 (e.g., 5px)
  if (scrollTop + clientHeight >= scrollHeight - 5) {
    isButtonDisabled.value = false;
    showScrollHint.value = false; // 滾動到底部，隱藏提示
  }
};

const closeModal = () => {
  emit('close');
};
</script>

<style scoped>
p {
  margin: 0;
  padding: 0;
  border: 0;
  font-size: 100%;
  font: inherit;
  vertical-align: baseline;
}
.important {
  color: red;
}
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
  max-width: 600px;
  display: flex;
  flex-direction: column;
}
.modal-title {
  margin-bottom: 1rem;
  text-align: center;
}
.note {
  background-color: #ededed;
  border-radius: 16px;
  padding: 16px;
}
.announcement-body {
  position: relative; /* sticky 定位的容器需要 position */
  max-height: 50vh;
  overflow-y: auto;
  border: 1px solid #ccc;
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: #f8f9fa;
}
.modal-footer {
  text-align: right;
}
.scroll-hint {
  position: sticky;
  bottom: -1px; /* -1px 確保完全貼底 */
  margin: 0 -1rem -1rem; /* 擴展以覆蓋 padding */
  padding: 0.75rem;
  background-color: #e9ecef; /* 給予一個稍微不同的背景色以示區別 */
  text-align: center;
  border-top: 1px solid #ccc;
}
</style>
