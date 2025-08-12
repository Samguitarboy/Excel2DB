import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGuestStore = defineStore('guest', () => {
  const isGuestMode = ref(false);
  const guestMajorUnit = ref(''); // 新增：儲存主要部門名稱
  const guestSubUnits = ref([]); // 新增：儲存子單位陣列

  // 更新 setGuestMode 來接收兩個參數
  function setGuestMode(majorUnit, subUnits) {
    isGuestMode.value = true;
    guestMajorUnit.value = majorUnit;
    guestSubUnits.value = subUnits;
  }

  // 更新 clearGuestMode 來清除所有相關狀態
  function clearGuestMode() {
    isGuestMode.value = false;
    guestMajorUnit.value = '';
    guestSubUnits.value = [];
  }

  return { isGuestMode, guestMajorUnit, guestSubUnits, setGuestMode, clearGuestMode };
});
