<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import RouteLoadingBar from '@/components/RouteLoadingBar.vue'
import { useI18nStore } from '@/stores/i18n'
import { isAnyLoading, setRouteLoading } from '@/stores/loading'
import gsap from 'gsap'

const router = useRouter()
const i18n = useI18nStore()
const isDark = ref(false)
const transitioning = ref(false)
const overlayRef = ref<HTMLElement | null>(null)

// ─── Universal loading progress bar ───────────────────────────
// Combines route transitions + in-flight API calls into a single
// loading indicator. The RouteLoadingBar watches `isAnyLoading`
// which is true when either route is transitioning OR an API
// request is in progress.
router.beforeEach(() => {
  setRouteLoading(true)
})

router.afterEach(() => {
  // Brief delay to let the page transition animation play
  // before the loading bar snaps to 100% and fades out
  setTimeout(() => {
    setRouteLoading(false)
  }, 100)
})



function toggleDark() {
  if (transitioning.value) return
  transitioning.value = true

  const goingDark = !isDark.value
  const overlay = overlayRef.value
  if (!overlay) {
    // Fallback: toggle instantly if overlay element is missing
    isDark.value = goingDark
    document.documentElement.classList.toggle('dark', goingDark)
    localStorage.setItem('theme', goingDark ? 'dark' : 'light')
    transitioning.value = false
    return
  }

  // Set overlay colour to the TARGET theme (the one we're going TO)
  overlay.className = `theme-overlay ${goingDark ? 'theme-overlay--dark' : 'theme-overlay--light'}`

  // Temporarily add transition class to all elements for smooth individual property changes
  document.documentElement.classList.add('theme-transitioning')

  // Timeline: fade in -> toggle class -> fade out
  const tl = gsap.timeline({
    onComplete: () => {
      transitioning.value = false
      // Remove the global transition class after a short delay
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning')
      }, 300)
    },
  })

  tl.to(overlay, {
    opacity: 0.92,
    duration: 0.12,
    ease: 'power2.in',
    onComplete: () => {
      // Toggle while overlay is fully opaque — user sees no flash
      isDark.value = goingDark
      document.documentElement.classList.toggle('dark', goingDark)
      localStorage.setItem('theme', goingDark ? 'dark' : 'light')

      // Also update the theme-color meta tag for browser chrome
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) {
        meta.setAttribute('content', goingDark ? '#020617' : '#f8fafc')
      }
    },
  })
    .to(overlay, {
      opacity: 0,
      duration: 0.3,
      ease: 'power3.out',
    })
}

function applyLocaleClasses(locale: string) {
  document.documentElement.lang = locale
  document.body.classList.toggle('locale-km', locale === 'km')
}

watch(() => i18n.locale, (newLocale) => {
  applyLocaleClasses(newLocale)
}, { immediate: true })

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
    document.documentElement.classList.add('dark')
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', '#020617')
  }
})
</script>

<template>
  <!-- Theme crossfade overlay — sits above everything during transitions -->
  <div ref="overlayRef" class="theme-overlay" style="opacity: 0;"></div>

  <!-- Universal loading bar: route transitions + in-flight API calls -->
  <RouteLoadingBar :loading="isAnyLoading" />

  <div class="min-h-screen flex flex-col">
    <Navbar
      :is-dark="isDark"
      :transitioning="transitioning"
      @toggle-dark="toggleDark"
    />
    <main class="flex-1">
      <router-view v-slot="{ Component }">
        <transition
          name="page"
          mode="out-in"
          @enter="(el) => { (el as HTMLElement).style.opacity = '1' }"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <Footer />
    <ToastContainer />
  </div>
</template>

<style>
.page-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>
