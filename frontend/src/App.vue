<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';

// --- 狀態管理 ---
const excelData = ref([]);
const isLoading = ref(false);
const error = ref('');
const searchQuery = ref('');

// --- 最終修復：使用一個單一、可為 null 的 ref 來代表選擇的檔案 ---
const selectedFile = ref(null); 

// --- Vuetify v-data-table 所需的 Headers 格式 ---
const headers = computed(() => {
  if (excelData.value.length === 0) {
    return [];
  }
  return Object.keys(excelData.value[0]).map(key => ({
    title: key,
    key: key,
    align: 'start',
    sortable: true,
  }));
});

// --- 生命週期鉤子 ---
onMounted(() => {
  const savedData = localStorage.getItem('excelData');
  if (savedData) {
    try {
      excelData.value = JSON.parse(savedData);
    } catch (e) {
      localStorage.removeItem('excelData');
    }
  }
});

// --- 函式 ---
// 明確的事件處理函式，用來更新我們的單一狀態
const handleFileSelection = (files) => {
  // v-file-input 會傳回一個檔案陣列，我們只取第一個，或者設為 null
  selectedFile.value = (files && files.length > 0) ? files[0] : null;
};

const uploadFile = async () => {
  // 函式現在只依賴 'selectedFile' 這個唯一的狀態
  if (!selectedFile.value) {
    error.value = '請先選擇一個 Excel 檔案。';
    return;
  }
  
  isLoading.value = true;
  error.value = '';
  searchQuery.value = '';

  const formData = new FormData();
  formData.append('file', selectedFile.value);

  try {
    const response = await axios.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    excelData.value = response.data;
    localStorage.setItem('excelData', JSON.stringify(response.data));
  } catch (err) {
    excelData.value = [];
    localStorage.removeItem('excelData');
    error.value = `上傳失敗：${err.response?.data || err.message}`;
  } finally {
    // --- 關鍵：無論成功或失敗，都將狀態徹底重設 ---
    selectedFile.value = null; 
    isLoading.value = false;
  }
};

const clearData = () => {
  excelData.value = [];
  localStorage.removeItem('excelData');
  searchQuery.value = '';
  error.value = '';
  selectedFile.value = null;
};
</script>

<template>
  <v-app>
    <v-main>
      <v-container>
        <v-overlay :model-value="isLoading" class="align-center justify-center">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        </v-overlay>

        <v-card class="pa-4" elevation="2">
          <v-card-title class="text-h5 mb-4">Excel 內容呈現 (Vuetify 版)</v-card-title>
          
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" md="6">
                <!-- 
                  :model-value 綁定確保了當我們在程式碼中將 selectedFile 設為 null 時，
                  輸入框的視覺狀態會被清空。
                -->
                <v-file-input
                  :model-value="selectedFile ? [selectedFile] : []"
                  @update:model-value="handleFileSelection"
                  label="選擇 Excel 檔案"
                  accept=".xlsx, .xls"
                  variant="outlined"
                  density="compact"
                  prepend-icon="mdi-file-excel"
                  show-size
                  clearable
                ></v-file-input>
              </v-col>
              <v-col cols="12" md="6" class="d-flex">
                <v-btn 
                  @click="uploadFile" 
                  :disabled="!selectedFile || isLoading" 
                  color="primary" 
                  class="mr-4"
                  prepend-icon="mdi-upload"
                >
                  上傳並顯示
                </v-btn>
                <v-btn 
                  v-if="excelData.length > 0" 
                  @click="clearData" 
                  color="error"
                  prepend-icon="mdi-close"
                >
                  清除資料
                </v-btn>
              </v-col>
            </v-row>

            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              class="mt-4"
              closable
              @click:close="error = ''"
            >
              {{ error }}
            </v-alert>
          </v-card-text>

          <v-divider class="my-4" v-if="excelData.length > 0"></v-divider>

          <v-card-text v-if="excelData.length > 0">
            <v-text-field
              v-model="searchQuery"
              label="搜尋表格內容..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              class="mb-4"
              clearable
            ></v-text-field>

            <v-data-table
              :headers="headers"
              :items="excelData"
              :search="searchQuery"
              items-per-page="10"
              class="elevation-1"
              density="compact"
              :items-per-page-options="[
                { value: 10, title: '10' },
                { value: 20, title: '20' },
                { value: 50, title: '50' },
                { value: -1, title: '全部' }
              ]"
            >
              <template v-slot:no-data>
                <p class="text-center py-4">沒有可顯示的資料。</p>
              </template>
              <template v-slot:no-results>
                <p class="text-center py-4">找不到符合 "{{ searchQuery }}" 的結果。</p>
              </template>
            </v-data-table>
          </v-card-text>

          <v-card-text v-if="excelData.length === 0 && !error" class="text-center text-grey">
            <v-icon size="48" class="mb-2">mdi-table-off</v-icon>
            <p>尚未上傳資料，或 localStorage 中無暫存資料。</p>
            <p>請選擇一個 Excel 檔案並點擊上傳。</p>
          </v-card-text>

        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
/* Vuetify 會處理大部分樣式，這裡可以留空或放一些微調 */
</style>