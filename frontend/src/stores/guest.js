import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGuestStore = defineStore('guest', () => {
  const isGuestMode = ref(false);
  const guestUnit = ref('');

  function setGuestMode(unit) {
    isGuestMode.value = true;
    guestUnit.value = unit;
  }

  function clearGuestMode() {
    isGuestMode.value = false;
    guestUnit.value = '';
  }

  return { isGuestMode, guestUnit, setGuestMode, clearGuestMode };
});
