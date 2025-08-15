import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGuestStore = defineStore('guest', () => {
  // 1. 從 sessionStorage 恢復狀態
  const savedSession = sessionStorage.getItem('guest-session');
  const initialState = savedSession ? JSON.parse(savedSession) : {
    isGuestMode: false,
    guestMajorUnit: '',
    guestSubUnits: [],
  };

  const isGuestMode = ref(initialState.isGuestMode);
  const guestMajorUnit = ref(initialState.guestMajorUnit);
  const guestSubUnits = ref(initialState.guestSubUnits);

  // 更新 setGuestMode 來接收兩個參數並存入 sessionStorage
  function setGuestMode(majorUnit, subUnits) {
    isGuestMode.value = true;
    guestMajorUnit.value = majorUnit;
    guestSubUnits.value = subUnits;

    // 2. 將狀態存入 sessionStorage
    const sessionData = {
      isGuestMode: true,
      guestMajorUnit: majorUnit,
      guestSubUnits: subUnits,
    };
    sessionStorage.setItem('guest-session', JSON.stringify(sessionData));
  }

  // 更新 clearGuestMode 來清除所有相關狀態和 sessionStorage
  function clearGuestMode() {
    isGuestMode.value = false;
    guestMajorUnit.value = '';
    guestSubUnits.value = [];

    // 3. 從 sessionStorage 中移除狀態
    sessionStorage.removeItem('guest-session');
  }

  return { isGuestMode, guestMajorUnit, guestSubUnits, setGuestMode, clearGuestMode };
});