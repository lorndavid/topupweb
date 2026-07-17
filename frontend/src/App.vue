<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import gsap from 'gsap'

const router = useRouter()
const isDark = ref(false)
const transitioning = ref(false)
const overlayRef = ref<HTMLElement | null>(null)

// ─── Page transition loading overlay ────────────────────────
// Shows a centered loading spinner between route transitions.
// The overlay is GSAP-animated so it's buttery smooth.
const loadingOverlayRef = ref<HTMLElement | null>(null)

router.beforeEach(() => {
  // Show the loading overlay immediately
  if (loadingOverlayRef.value) {
    gsap.to(loadingOverlayRef.value, {
      opacity: 1,
      duration: 0.08,
      ease: 'power2.out',
    })
  }
})

function onPageLeave(el: Element, done: () => void) {
  gsap.to(el, {
    opacity: 0,
    y: -8,
    scale: 0.97,
    duration: 0.12,
    ease: 'power2.in',
    onComplete: done,
  })
}

function onPageEnter(el: Element, done: () => void) {
  const overlay = loadingOverlayRef.value
  const tl = gsap.timeline({ onComplete: done })

  // Brief hold so the spinner is seen at least briefly (no flash)
  tl.to({}, { duration: 0.2 })

  // Fade out loading overlay
  if (overlay) {
    tl.to(overlay, {
      opacity: 0,
      duration: 0.12,
      ease: 'power2.in',
    })
  }

  // Animate page in
  tl.fromTo(
    el,
    { opacity: 0, y: 20, scale: 0.97 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.35,
      ease: 'power3.out',
      clearProps: 'transform',
    },
    '-=0.05'
  )
}

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

  <!-- Page transition loading overlay -->
  <div
    ref="loadingOverlayRef"
    class="page-loading-overlay"
    style="opacity: 0;"
    aria-hidden="true"
  >
    <div class="page-loading-inner">
      <div class="page-loading-spinner"></div>
      <p class="page-loading-text">Loading</p>
    </div>
  </div>

  <div class="min-h-screen flex flex-col">
    <Navbar
      :is-dark="isDark"
      :transitioning="transitioning"
      @toggle-dark="toggleDark"
    />
    <main class="flex-1">
      <router-view v-slot="{ Component }">
        <transition
          mode="out-in"
          @leave="onPageLeave"
          @enter="onPageEnter"
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
/* ═══ Page transition loading overlay ═══ */
.page-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(248, 250, 252, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  will-change: opacity;
}

.dark .page-loading-overlay {
  background: rgba(2, 6, 23, 0.75);
}

.page-loading-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.page-loading-spinner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid theme('colors.surface.200');
  border-top-color: theme('colors.primary.500');
  animation: page-spin 0.8s linear infinite;
}

.dark .page-loading-spinner {
  border-color: theme('colors.surface.700');
  border-top-color: theme('colors.primary.400');
}

.page-loading-text {
  font-size: 13px;
  font-weight: 500;
  color: theme('colors.surface.400');
  letter-spacing: 0.05em;
  animation: page-pulse 1.5s ease-in-out infinite;
}

.dark .page-loading-text {
  color: theme('colors.surface.500');
}

@keyframes page-spin {
  to { transform: rotate(360deg); }
}

@keyframes page-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
</style>
