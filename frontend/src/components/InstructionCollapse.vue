<template>
  <div class="stepper-container">
    <div v-for="(step, index) in steps" :key="step.id" class="step">
      <div class="step-content" :class="{ 'step-content-reversed': index % 2 !== 0 }">
        <!-- 圖片區塊 -->
        <div class="image-block">
          <img :src="step.imgSrc" :alt="step.title" class="step-image">
        </div>
        
        <!-- 文字區塊 -->
        <div class="text-block">
          <div class="step-indicator">
            <div class="step-number">{{ step.id }}</div>
          </div>
          <h3 class="step-title">{{ step.title }}</h3>
          <p class="step-description">{{ step.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// 在這裡定義您的三個步驟
// 您只需要修改 title, description, 和 imgSrc
const steps = ref([
  {
    id: 1,
    title: '步驟一：隨身碟保管人',
    description: '請點擊「下載 PDF」按鈕，取得您的申請單。列印出來後，請勾選此隨身碟為「個人使用」or「單位共用」，並填寫預計更換時間(最晚至10月底)，完成後交給單位管控窗口。',
    imgSrc: new URL('../../assets/img/instruction1.png', import.meta.url).href 
  },
  {
    id: 2,
    title: '步驟二：單位管控窗口',
    description: '彙整單位內所有申請單，簽名後再送交給主管簽核。(行政單位至主任、第一二工廠單位至廠長)',
    imgSrc: new URL('../../assets/img/instruction2.png', import.meta.url).href
  },
  {
    id: 3,
    title: '步驟三：單位主管',
    description: '單位主管簽核後，再將申請單回傳資訊室。',
    imgSrc: new URL('../../assets/img/instruction3.png', import.meta.url).href
  }
]);
</script>

<style scoped>
.stepper-container {
  position: relative;
  max-width: 900px;
  margin: 2rem auto;
  padding: 2rem 0;
  /* 繪製中間的垂直線 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 3px;
    height: 100%;
    background-color: #e9ecef;
    transform: translateX(-50%);
  }
}

.step {
  position: relative;
  margin-bottom: 4rem;
}

.step-content {
  display: flex;
  align-items: center;
  gap: 2rem;
  width: 100%;
}

/* 讓偶數步驟的圖片和文字反向 */
.step-content-reversed {
  flex-direction: row-reverse;
}

.image-block,
.text-block {
  flex: 1;
  padding: 1.5rem;
}

.text-block {
  position: relative;
}

.step-image {
  width: 100%;
  border-radius: 0.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  object-fit: cover;
}

.step-indicator {
  position: absolute;
  top: 50%;
  /* 根據左右位置調整 */
  left: -4rem;
  transform: translateY(-50%);
  z-index: 1;
}

.step-content-reversed .step-indicator {
  left: auto;
  right: -4rem;
}

.step-number {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #0d6efd;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.5rem;
  font-weight: bold;
  border: 4px solid white;
  box-shadow: 0 0 0 3px #0d6efd;
}

.step-title {
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
  color: #343a40;
}

.step-description {
  font-size: 1rem;
  color: #6c757d;
  line-height: 1.6;
}

/* 手機版響應式設計 */
@media (max-width: 768px) {
  .stepper-container::before {
    left: 25px; /* 將線移到左邊 */
  }
  .step-content,
  .step-content-reversed {
    flex-direction: column;
  }
  .image-block,
  .text-block {
    width: 100%;
    padding: 0 0 0 40px; /* 讓文字區塊往右移 */
  }
  .image-block {
    padding: 1rem 0 1rem 40px;
  }
  .step-indicator {
    left: 0;
    top: -10px;
    transform: translateY(0);
  }
  .step-content-reversed .step-indicator {
    right: auto;
    left: 0;
  }
}
</style>