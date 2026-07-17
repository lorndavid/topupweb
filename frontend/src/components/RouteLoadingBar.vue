<script setup lang="ts">
/**
 * RouteLoadingBar.vue
 *
 * A thin (3px) animated loading bar that appears at the top of the viewport
 * during route transitions. Uses GSAP for buttery-smooth progress animations.
 *
 * Usage:
 *   <RouteLoadingBar :loading="isLoading" @complete="onComplete" />
 *
 * The parent (App.vue) drives it via router navigation guards.
 */
import { ref, watch, onMounted, nextTick } from 'vue'
import gsap from 'gsap'

const props = defineProps<{
  loading: boolean
}>()

const barRef = ref<HTMLElement | null>(null)
const wrapperRef = ref<HTMLElement | null>(null)

// ─── GSAP timeline reference ─────────────────────────────
let tl: gsap.core.Timeline | null = null

/**
 * Start the loading bar animation:
 * 1. Bar becomes visible (opacity 1)
 * 2. Width quickly jumps to 30% (fast user feedback)
 * 3. Then slowly crawls to 85% (simulates progress while route loads)
 */
function startLoading() {
  if (!barRef.value || !wrapperRef.value) return

  // Kill any existing animation
  if (tl) tl.kill()

  // Reset and show
  gsap.set(wrapperRef.value, { opacity: 1 })
  gsap.set(barRef.value, { width: '0%' })

  tl = gsap.timeline({
    onComplete: () => {
      // After the crawl, hold at 85% until route resolves
    },
  })

  // Phase 1: Quick burst to 30% (feels responsive)
  tl.to(barRef.value, {
    width: '30%',
    duration: 0.25,
    ease: 'power2.out',
  })

  // Phase 2: Slow crawl to 85% (simulates background work)
  tl.to(barRef.value, {
    width: '85%',
    duration: 2.0,
    ease: 'power1.inOut',
  })
}

/**
 * Complete the loading bar:
 * 1. Kill any in-progress timeline
 * 2. Snap to 100%
 * 3. Then fade out the entire wrapper
 */
function completeLoading() {
  if (!barRef.value || !wrapperRef.value) return

  // Kill any in-progress timeline to prevent conflicting tweens
  if (tl) tl.kill()

  // Snap to 100% immediately with a subtle overshoot
  gsap.to(barRef.value, {
    width: '100%',
    duration: 0.2,
    ease: 'power2.out',
    onComplete: () => {
      // Brief pause at 100%, then fade out
      gsap.to(wrapperRef.value, {
        opacity: 0,
        duration: 0.25,
        delay: 0.15,
        ease: 'power2.in',
        onComplete: () => {
          // Reset width for next transition
          gsap.set(barRef.value, { width: '0%' })
        },
      })
    },
  })
}

// ─── Watch the loading prop ───────────────────────────────
watch(
  () => props.loading,
  (val) => {
    if (val) {
      startLoading()
    } else {
      completeLoading()
    }
  }
)
</script>

<template>
  <!--
    Wrapper: fixed at the very top, full viewport width, zero height.
    The actual bar is 3px tall and positioned at the top of this wrapper.
  -->
  <div
    ref="wrapperRef"
    class="route-loading-wrapper"
    style="opacity: 0;"
    aria-hidden="true"
  >
    <div
      ref="barRef"
      class="route-loading-bar"
      style="width: 0%;"
    ></div>
  </div>
</template>

<style scoped>
.route-loading-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 10000;
  pointer-events: none;
  overflow: hidden;
}

.route-loading-bar {
  height: 100%;
  background: linear-gradient(
    90deg,
    #3b82f6,
    #6366f1,
    #8b5cf6,
    #6366f1,
    #3b82f6
  );
  background-size: 200% 100%;
  border-radius: 0 2px 2px 0;
  box-shadow:
    0 0 8px rgba(59, 130, 246, 0.5),
    0 0 20px rgba(99, 102, 241, 0.3);
  will-change: width;
  animation: shimmer 1.5s linear infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
