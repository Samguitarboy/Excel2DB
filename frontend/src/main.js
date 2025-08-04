import { createApp } from 'vue'
import { createPinia } from 'pinia' // 引入
import App from './App.vue'
import router from './router'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap'

const app = createApp(App)
const pinia = createPinia() // 建立實例

app.use(pinia) // 掛載
app.use(router)

app.mount('#app')
