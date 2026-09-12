import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

// ─── GSAP: Explicitly register CSSPlugin to prevent tree-shaking issues ──
import gsap from 'gsap'
import { CSSPlugin } from 'gsap/CSSPlugin'
gsap.registerPlugin(CSSPlugin)

import { setupGoogleAnalytics } from './plugins/googleAnalytics'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize Google Analytics (activates if VITE_GA_MEASUREMENT_ID is configured)
setupGoogleAnalytics(router)

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
