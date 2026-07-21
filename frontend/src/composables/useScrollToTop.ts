import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Composable that shows a "scroll to top" flag when the user scrolls
 * past the bottom of a given target element.
 */
export function useScrollToTop(targetRef: Ref<HTMLElement | null>, offset = 0) {
  const show = ref(false)

  function handleScroll() {
    const el = targetRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    show.value = rect.bottom < offset
  }

  function scrollToTop() {
    const el = targetRef.value
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })

  return { showScrollTop: show, scrollToTop }
}
