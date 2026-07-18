<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { getCambodiaGames } from '@/services/api'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'
import type { GameCategory } from '@/types'
import gsap from 'gsap'

const router = useRouter()

// ─── Simple IntersectionObserver for scroll-triggered animations ───
function observeScrollAnimation(el: HTMLElement, callback: () => void) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback()
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.15 }
  )
  observer.observe(el)
}
const gameStore = useGameStore()

const featured = ref<GameCategory[]>([])
const others = ref<GameCategory[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// ─── Refs ───
const heroRef = ref<HTMLElement | null>(null)
const featuredRef = ref<HTMLElement | null>(null)
const allGamesRef = ref<HTMLElement | null>(null)
const ctaRef = ref<HTMLElement | null>(null)

const totalGames = ref(0)

// ─── Featured scroll ───
const featuredScrollRef = ref<HTMLElement | null>(null)
const mobileFeaturedScrollRef = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(true)
const activeDotIndex = ref(0)

function updateScrollButtons() {
  const el = featuredScrollRef.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 4
  canScrollRight.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 4
}

function updateActiveDot() {
  const el = mobileFeaturedScrollRef.value
  if (!el) return
  const card = el.querySelector('.featured-card')
  if (!card) return
  const cardWidth = card.getBoundingClientRect().width
  const gap = 10 // gap-2.5 = 10px
  const step = cardWidth + gap
  if (step <= 0) return
  const idx = Math.round(el.scrollLeft / step)
  activeDotIndex.value = Math.min(idx, featured.value.length - 1)
}

function scrollFeatured(direction: 'left' | 'right') {
  const el = featuredScrollRef.value
  if (!el) return
  const cardWidth = el.querySelector('.featured-card')?.getBoundingClientRect().width || 260
  const gap = 16
  const scrollAmount = cardWidth + gap
  el.scrollBy({
    left: direction === 'left' ? -scrollAmount : scrollAmount,
    behavior: 'smooth',
  })
}

function scrollFeaturedToIndex(index: number) {
  const el = mobileFeaturedScrollRef.value
  if (!el) return
  const card = el.querySelector('.featured-card')
  if (!card) return
  const cardWidth = card.getBoundingClientRect().width
  const gap = 10
  el.scrollTo({
    left: index * (cardWidth + gap),
    behavior: 'smooth',
  })
}

function handleFeaturedScroll() {
  updateScrollButtons()
  updateActiveDot()
}

// Update scroll buttons + attach listeners when featured data loads
watch(featured, () => {
  nextTick(() => {
    updateScrollButtons()
    updateActiveDot()
    // Attach desktop scroll listener (container doesn't exist at mount time)
    const desktopEl = featuredScrollRef.value
    if (desktopEl && !desktopEl.dataset.listenerAttached) {
      desktopEl.addEventListener('scroll', updateScrollButtons, { passive: true })
      desktopEl.dataset.listenerAttached = 'true'
    }
    // Attach mobile scroll listener (container doesn't exist at mount time)
    const mobileEl = mobileFeaturedScrollRef.value
    if (mobileEl && !mobileEl.dataset.listenerAttached) {
      mobileEl.addEventListener('scroll', handleFeaturedScroll, { passive: true })
      mobileEl.dataset.listenerAttached = 'true'
    }
  })
})

// ─── Search ───
const searchQuery = ref('')



// ─── Computed ───
const filteredOthers = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return others.value
  return others.value.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.game_code.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q)
  )
})

// ─── Navigation ───
function navigateToGame(gameCode: string) {
  router.push(`/game/${gameCode}`)
}

// ─── Data fetching ───
async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const data = await getCambodiaGames()
    featured.value = data.featured
    others.value = data.others
    totalGames.value = data.total
    gameStore.categories = [...data.featured, ...data.others]
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load games'
  } finally {
    loading.value = false
  }
}

// ─── Entrance animations ───
function initAnimations() {
  nextTick(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    // Hero entrance
    if (heroRef.value) {
      const els = heroRef.value.querySelectorAll('.hero-el')
      tl.fromTo(
        els,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.07 }
      )
    }

    // Featured cards
    if (featuredRef.value) {
      const cards = featuredRef.value.querySelectorAll('.featured-card')
      if (cards.length > 0) {
        tl.fromTo(
          cards,
          { opacity: 0, y: 25, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.06, ease: 'back.out(1.5)' },
          '-=0.1'
        )
      }
    }

    // All games cards (scroll-triggered via IntersectionObserver)
    if (allGamesRef.value) {
      const el = allGamesRef.value
      observeScrollAnimation(el, () => {
        const cards = el.querySelectorAll('.game-card-item')
        if (cards.length > 0) {
          gsap.fromTo(
            cards,
            { opacity: 0, y: 20 },
            {
              opacity: 1, y: 0,
              duration: 0.35,
              stagger: { amount: 0.4, from: 'start' },
              ease: 'power2.out',
            }
          )
        }
      })
    }
  })
}

onMounted(() => {
  fetchData()
  initAnimations()

  // Listeners attached in watch(featured) after DOM renders —
  // see the `watch` callback below which fires after async data loads.
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-surface-50 to-white dark:from-surface-950 dark:to-surface-900">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14">
      <!-- ═══ HERO SECTION ═══ -->
      <div ref="heroRef" class="text-center mb-10 sm:mb-14 lg:mb-16">
        <!-- Badge -->
        <div class="hero-el inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-200/50 dark:border-primary-800/30 mb-5">
          <span class="flex gap-1">
            <span class="w-2 h-2 rounded-full bg-primary-400 animate-pulse"></span>
            <span class="w-2 h-2 rounded-full bg-red-400 animate-pulse" style="animation-delay: 0.3s;"></span>
            <span class="w-2 h-2 rounded-full bg-primary-400 animate-pulse" style="animation-delay: 0.6s;"></span>
          </span>
          <span class="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-[0.15em]">🇰🇭 Cambodia Top-Up</span>
        </div>

        <!-- Headline -->
        <h1 class="hero-el text-3xl sm:text-4xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-balance">
          <span class="text-surface-900 dark:text-white">{{ 'Top Up' }}</span>
          <br class="sm:hidden" />
          <span class="bg-gradient-to-r from-primary-500 to-blue-600 dark:from-amber-300 to-blue-400 bg-clip-text text-transparent">{{ 'Your Favorite Games' }}</span>
        </h1>

        <p class="hero-el mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg text-surface-500 dark:text-surface-400 max-w-lg mx-auto">
          Fast &amp; secure game top-ups in Cambodia.
          <span class="text-surface-700 dark:text-surface-300 font-medium">KHQR Payment — Instant Delivery.</span>
        </p>

        <!-- Stats -->
        <div class="hero-el mt-6 flex items-center justify-center gap-5 sm:gap-8 text-center">
          <div>
            <p class="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white tabular-nums">{{ totalGames }}</p>
            <p class="text-xs text-surface-400 dark:text-surface-500 mt-0.5">Games</p>
          </div>
          <div class="w-px h-8 bg-surface-200 dark:bg-surface-700"></div>
          <div>
            <p class="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400">KHQR</p>
            <p class="text-xs text-surface-400 dark:text-surface-500 mt-0.5">Payment</p>
          </div>
          <div class="w-px h-8 bg-surface-200 dark:bg-surface-700"></div>
          <div>
            <p class="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 inline -mt-0.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </p>
            <p class="text-xs text-surface-400 dark:text-surface-500 mt-0.5">Delivery</p>
          </div>
        </div>
      </div>

      <!-- ═══ LOADING STATE ═══ -->
      <div v-if="loading" class="max-w-6xl mx-auto space-y-10">
        <!-- Featured games skeleton (matches top games layout) -->
        <div>
          <div class="flex items-center gap-3 mb-5 sm:mb-6">
            <div class="w-1 h-5 sm:h-6 rounded-full bg-gradient-to-b from-amber-400/40 to-orange-500/40"></div>
            <div class="h-5 sm:h-6 w-36 rounded-lg bg-surface-200 dark:bg-surface-700/60 skeleton-subtle"></div>
          </div>
          <LoadingSkeleton variant="featured-card" :count="4" />
        </div>
        <!-- Divider -->
        <div class="h-px bg-gradient-to-r from-transparent via-surface-300 dark:via-surface-600 to-transparent"></div>
        <!-- All games skeleton (matches 3/4/6 column grid) -->
        <div>
          <div class="flex items-center gap-3 mb-5 sm:mb-6">
            <div class="w-1 h-5 sm:h-6 rounded-full bg-gradient-to-b from-primary-400/40 to-primary-600/40"></div>
            <div class="h-5 sm:h-6 w-28 rounded-lg bg-surface-200 dark:bg-surface-700/60 skeleton-subtle"></div>
          </div>
          <LoadingSkeleton variant="game-card" :count="12" />
        </div>
      </div>

      <!-- ═══ ERROR STATE ═══ -->
      <div v-else-if="error" class="text-center py-16">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-surface-500 dark:text-surface-400 text-sm mb-4">{{ error }}</p>
        <button @click="fetchData" class="btn-primary text-sm">
          <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>
      </div>

      <!-- ═══ GAMES CONTENT ═══ -->
      <div v-else class="max-w-6xl mx-auto space-y-10 sm:space-y-12 lg:space-y-16">
        <!-- ─── FEATURED GAMES ─── -->
        <div v-if="featured.length > 0" ref="featuredRef">
          <div class="flex items-center gap-3 mb-5 sm:mb-6">
            <div class="w-1 h-5 sm:h-6 rounded-full bg-gradient-to-b from-amber-400 to-orange-500"></div>
            <h2 class="text-base sm:text-lg font-bold text-surface-900 dark:text-white uppercase tracking-wider">Top Games 🇰🇭</h2>
          </div>

          <!-- Mobile: horizontal scroll row (single row, smaller cards) -->
          <div
            ref="mobileFeaturedScrollRef"
            class="md:hidden flex overflow-x-auto gap-2.5 pb-2 -mx-4 px-4 snap-x snap-mandatory hide-scrollbar"
          >
            <div
              v-for="game in featured"
              :key="game.game_code"
              class="featured-card shrink-0 w-[42vw] sm:w-[36vw] snap-start"
            >
              <div
                @click="navigateToGame(game.game_code)"
                class="group relative cursor-pointer rounded-xl overflow-hidden bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700/80 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-0.5"
              >
                <div class="relative aspect-[4/3] overflow-hidden">
                  <img
                    :src="game.image_url"
                    :alt="game.name"
                    class="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>

                  <!-- Name overlay -->
                  <div class="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                    <h3 class="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors duration-300 drop-shadow-lg leading-tight">
                      {{ game.name }}
                    </h3>
                  </div>
                </div>

                <!-- Bottom bar -->
                <div class="p-2 sm:p-2.5 flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-lg overflow-hidden ring-1 ring-surface-200 dark:ring-surface-700 shrink-0">
                      <img :src="game.image_url" :alt="game.name" class="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div class="flex items-center gap-0.5 text-surface-400 dark:text-surface-500 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-all duration-300">
                    <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Mobile: pagination dot indicators -->
          <div v-if="featured.length > 1" class="md:hidden flex items-center justify-center gap-1.5 mt-1.5">
            <button
              v-for="(_, idx) in featured"
              :key="idx"
              @click="scrollFeaturedToIndex(idx)"
              :class="[
                'rounded-full transition-all duration-300',
                idx === activeDotIndex
                  ? 'w-5 h-1.5 bg-primary-500 dark:bg-primary-400'
                  : 'w-1.5 h-1.5 bg-surface-300 dark:bg-surface-600 hover:bg-surface-400 dark:hover:bg-surface-500'
              ]"
              :aria-label="'Go to card ' + (idx + 1)"
            ></button>
          </div>

          <!-- Tablet+ : horizontal scroll row with arrow navigation -->
          <div class="hidden md:block relative">
            <!-- Left Arrow -->
            <button
              v-show="canScrollLeft"
              @click="scrollFeatured('left')"
              class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-10 h-10 rounded-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 shadow-lg flex items-center justify-center text-surface-500 hover:text-primary-500 hover:border-primary-300 dark:hover:text-primary-400 dark:hover:border-primary-600 transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label="Scroll left"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <!-- Scroll Container -->
            <div
              ref="featuredScrollRef"
              class="flex flex-row gap-4 overflow-x-auto pb-2 hide-scrollbar"
            >
              <div
                v-for="game in featured"
                :key="game.game_code"
                class="featured-card shrink-0 w-[calc(25%_-_12px)]"
              >
                <div
                  @click="navigateToGame(game.game_code)"
                  class="group relative cursor-pointer rounded-2xl overflow-hidden bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700/80 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-0.5"
                >
                  <div class="relative aspect-[4/3] overflow-hidden">
                    <img
                      :src="game.image_url"
                      :alt="game.name"
                      class="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>

                    <!-- Name overlay -->
                    <div class="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                      <h3 class="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors duration-300 drop-shadow-lg">
                        {{ game.name }}
                      </h3>
                    </div>
                  </div>

                  <!-- Bottom bar -->
                  <div class="p-3 sm:p-3.5 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg overflow-hidden ring-1 ring-surface-200 dark:ring-surface-700 shrink-0">
                        <img :src="game.image_url" :alt="game.name" class="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div class="flex items-center gap-1 text-surface-400 dark:text-surface-500 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-all duration-300">
                      <span class="text-[10px] font-medium hidden sm:inline">Top Up</span>
                      <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Arrow -->
            <button
              v-show="canScrollRight"
              @click="scrollFeatured('right')"
              class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-10 h-10 rounded-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 shadow-lg flex items-center justify-center text-surface-500 hover:text-primary-500 hover:border-primary-300 dark:hover:text-primary-400 dark:hover:border-primary-600 transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label="Scroll right"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <!-- ─── DIVIDER ─── -->
        <div v-if="others.length > 0" class="h-px bg-gradient-to-r from-transparent via-surface-300 dark:via-surface-600 to-transparent"></div>

        <!-- ─── ALL GAMES ─── -->
        <div v-if="others.length > 0" ref="allGamesRef">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-6">
            <div class="flex items-center gap-3">
              <div class="w-1 h-5 sm:h-6 rounded-full bg-gradient-to-b from-primary-400 to-primary-600"></div>
              <h2 class="text-base sm:text-lg font-bold text-surface-900 dark:text-white uppercase tracking-wider">All Games</h2>
              <span class="text-xs text-surface-400 dark:text-surface-500 font-mono">({{ filteredOthers.length }})</span>
            </div>

            <!-- Search Bar -->
            <div class="relative w-full sm:w-64">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search games..."
                class="w-full pl-10 pr-4 py-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 transition-all duration-200"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- No Results -->
          <div v-if="filteredOthers.length === 0 && searchQuery" class="text-center py-12">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 mb-3">
              <svg class="w-6 h-6 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p class="text-sm text-surface-500 dark:text-surface-400">No games matching "<span class="text-surface-700 dark:text-surface-300 font-medium">{{ searchQuery }}</span>"</p>
          </div>

          <!-- Games Grid: 3 cols mobile, 4 cols tablet, 6 cols desktop -->
          <div v-if="filteredOthers.length > 0" class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            <div
              v-for="game in filteredOthers"
              :key="game.game_code"
              class="game-card-item"
            >
              <div
                @click="navigateToGame(game.game_code)"
                class="group relative cursor-pointer rounded-xl overflow-hidden bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700/60 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <div class="aspect-[4/3] overflow-hidden">
                  <img
                    :src="game.image_url"
                    :alt="game.name"
                    class="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                </div>
                <div class="p-2 sm:p-2.5">
                  <p class="text-xs sm:text-[13px] font-semibold text-surface-800 dark:text-surface-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
                    {{ game.name }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ TRUST SECTION ═══ -->
        <div ref="ctaRef">
          <div class="max-w-lg mx-auto text-center">
            <div class="p-5 sm:p-8 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700/80 shadow-sm">
              <div class="flex items-center justify-center gap-2 mb-5">
                <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span class="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-[0.2em] font-semibold">Trusted &amp; Secure</span>
              </div>

              <div class="grid grid-cols-3 gap-4 sm:gap-6">
                <div class="text-center">
                  <div class="w-10 h-10 mx-auto rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-2">
                    <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p class="text-[11px] text-surface-500 dark:text-surface-400 font-medium">Secure<br/>KHQR Pay</p>
                </div>
                <div class="text-center">
                  <div class="w-10 h-10 mx-auto rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-2">
                    <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <p class="text-[11px] text-surface-500 dark:text-surface-400 font-medium">Instant<br/>Delivery</p>
                </div>
                <div class="text-center">
                  <div class="w-10 h-10 mx-auto rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-2">
                    <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p class="text-[11px] text-surface-500 dark:text-surface-400 font-medium">Best<br/>Prices</p>
                </div>
              </div>
            </div>

            <p class="mt-5 text-[10px] text-surface-400 dark:text-surface-500 font-medium tracking-wider">
              🇰🇭 Powered for Cambodian Gamers — KHQR Payment via Bakong
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
