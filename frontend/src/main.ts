import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')

// ─── Fade out the splash screen once Vue has mounted ───
const splash = document.getElementById('app-splash')
if (splash) {
  // Small delay so the splash entrance animation isn't cut off
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      splash.classList.add('splash-hidden')
      // Fully remove from DOM after transition completes
      setTimeout(() => {
        splash.remove()
      }, 600)
    })
  })
}
