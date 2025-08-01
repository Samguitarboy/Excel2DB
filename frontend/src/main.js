import { createApp } from 'vue'
import App from './App.vue'

// --- Vuetify ---
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css' // 引入 icon font

// 建立 Vuetify 實例
const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi', // 設定預設 icon 集合
  },
})

// 清理舊的 CSS，只保留基本設定
import './assets/main.css'

const app = createApp(App)

app.use(vuetify) // 啟用 Vuetify

app.mount('#app')