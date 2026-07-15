<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { getCambodiaGames } from '@/services/api'
import type { GameCategory } from '@/types'
import gsap from 'gsap'

const router = useRouter()
const gameStore = useGameStore()

const featured = ref<GameCategory[]>([])
const others = ref<GameCategory[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Refs for animations
const heroRef = ref<HTMLElement | null>(null)
const featuredRef = ref<HTMLElement | null>(null)
const allGamesRef = ref<HTMLElement | null>(null)
const ctaRef = ref<HTMLElement | null>(null)

const totalGames = ref(0)

const gameMeta: Record<string, { badge: string; gradient: string }> = {
  mlbb: { badge: '🇰🇭 Top Game', gradient: 'from-blue-600 to-purple-600' },
  freefire_sgmy: { badge: '🔥 Popular', gradient: 'from-orange-500 to-red-600' },
  pubgm: { badge: '⚔️ Battle Royale', gradient: 'from-yellow-600 to-red-600' },
  hok: { badge: '👑 MOBA', gradient: 'from-emerald-500 to-cyan-600' },
}

const searchQuery = ref('')
const searchInputRef = ref<HTMLElement | null>(null)

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

function navigateToGame(gameCode: string) {
  router.push(`/game/${gameCode}`)
}

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const data = await getCambodiaGames()
    featured.value = data.featured
    others.value = data.others
    totalGames.value = data.total
    // Sync all categories to store so GameDetail works
    gameStore.categories = [...data.featured, ...data.others]
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load games'
  } finally {
    loading.value = false
  }
}

function animateEntrance() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

  if (heroRef.value) {
    tl.fromTo(
      heroRef.value.querySelectorAll('.hero-el'),
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }
    )
  }

  nextTick(() => {
    if (featuredRef.value) {
      const cards = featuredRef.value.querySelectorAll('.featured-card')
      if (cards.length > 0) {
        tl.fromTo(
          cards,
          { opacity: 0, y: 30, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'back.out(1.6)' },
          '-=0.1'
        )
      }
    }

    if (allGamesRef.value) {
      const cards = allGamesRef.value.querySelectorAll('.game-card')
      if (cards.length > 0) {
        tl.fromTo(
          cards,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: 'power2.out' },
          '-=0.05'
        )
      }
    }

    if (ctaRef.value) {
      tl.fromTo(
        ctaRef.value.querySelectorAll('.cta-el'),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06 },
        '-=0.1'
      )
    }
  })
}

onMounted(() => {
  fetchData()
  animateEntrance()
})
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <!-- Dark ambient background -->
    <div class="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <div class="absolute top-[-15%] left-[-5%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[140px]"></div>
      <div class="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-red-600/8 blur-[140px]"></div>
      <div class="absolute top-[35%] right-[15%] w-[30%] h-[30%] rounded-full bg-amber-500/5 blur-[100px]"></div>
    </div>

    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14">
      <!-- ═══ HERO ═══ -->
      <div ref="heroRef" class="text-center mb-10 sm:mb-14">
        <div class="hero-el inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm mb-5">
          <span class="flex gap-0.5">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            <span class="w-2 h-2 rounded-full bg-red-500"></span>
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          </span>
          <span class="text-xs font-medium text-white/50 uppercase tracking-widest">🇰🇭 Cambodia Top-Up</span>
        </div>

        <h1 class="hero-el text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight">
          <span class="text-white">បញ្ចូលទឹកប្រាក់</span>
          <br class="sm:hidden" />
          <span class="bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-400 bg-clip-text text-transparent">ហ្គេមសំណព្វ</span>
        </h1>

        <p class="hero-el mt-4 text-base sm:text-lg text-white/40 max-w-lg mx-auto font-light">
          Fast & secure game top-ups.
          <span class="text-white/60">KHQR Payment — Instant Delivery.</span>
        </p>

        <!-- Stats -->
        <div class="hero-el mt-5 flex items-center justify-center gap-6 sm:gap-10 text-center">
          <div>
            <p class="text-2xl sm:text-3xl font-bold text-white">{{ totalGames }}</p>
            <p class="text-xs text-white/30 mt-0.5">Games</p>
          </div>
          <div class="w-px h-8 bg-white/10"></div>
          <div>
            <p class="text-2xl sm:text-3xl font-bold text-white">KHQR</p>
            <p class="text-xs text-white/30 mt-0.5">Payment</p>
          </div>
          <div class="w-px h-8 bg-white/10"></div>
          <div>
            <p class="text-2xl sm:text-3xl font-bold text-white">Instant</p>
            <p class="text-xs text-white/30 mt-0.5">Delivery</p>
          </div>
        </div>
      </div>

      <!-- ═══ LOADING ═══ -->
      <div v-if="loading" class="max-w-5xl mx-auto">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="rounded-2xl overflow-hidden animate-pulse bg-white/[0.03] border border-white/5">
            <div class="aspect-[4/3] bg-white/5"></div>
            <div class="p-4 space-y-2">
              <div class="h-4 bg-white/10 rounded w-2/3"></div>
              <div class="h-3 bg-white/5 rounded w-1/3"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ ERROR ═══ -->
      <div v-else-if="error" class="text-center py-16">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 mb-4">
          <svg class="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-white/50 text-sm mb-4">{{ error }}</p>
        <button @click="fetchData" class="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-medium backdrop-blur-sm border border-white/10 transition-all duration-200">
          Try Again
        </button>
      </div>

      <!-- ═══ GAMES CONTENT ═══ -->
      <div v-else class="max-w-6xl mx-auto space-y-10 sm:space-y-14">
        <!-- ─── FEATURED SECTION ─── -->
        <div v-if="featured.length > 0" ref="featuredRef">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-yellow-500"></div>
            <h2 class="text-lg font-bold text-white/90 uppercase tracking-wider">Top Games 🇰🇭</h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              v-for="(game, idx) in featured"
              :key="game.game_code"
              class="featured-card"
            >
              <div
                @click="navigateToGame(game.game_code)"
                class="group relative cursor-pointer rounded-2xl overflow-hidden bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all duration-400 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/5"
              >
                <!-- Image -->
                <div class="relative aspect-[4/3] overflow-hidden">
                  <img
                    :src="game.image_url"
                    :alt="game.name"
                    class="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>

                  <!-- Badge -->
                  <div class="absolute top-3 left-3">
                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md"
                      :class="{
                        'bg-blue-500/20 text-blue-300 border border-blue-400/20': game.game_code === 'mlbb',
                        'bg-orange-500/20 text-orange-300 border border-orange-400/20': game.game_code === 'freefire_sgmy',
                        'bg-yellow-500/20 text-yellow-300 border border-yellow-400/20': game.game_code === 'pubgm',
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-400/20': game.game_code === 'hok',
                      }"
                    >
                      <span class="w-1.5 h-1.5 rounded-full"
                        :class="{
                          'bg-blue-400': game.game_code === 'mlbb',
                          'bg-orange-400': game.game_code === 'freefire_sgmy',
                          'bg-yellow-400': game.game_code === 'pubgm',
                          'bg-emerald-400': game.game_code === 'hok',
                        }"
                      ></span>
                      {{ gameMeta[game.game_code]?.badge || 'Game' }}
                    </span>
                  </div>

                  <!-- Fields hint -->
                  <div class="absolute top-3 right-3 flex gap-1">
                    <span
                      v-for="field in game.game_fields"
                      :key="field"
                      class="px-2 py-1 bg-black/40 backdrop-blur-sm rounded-lg text-[10px] font-medium text-white/70 uppercase tracking-wider"
                    >{{ field === 'userid' ? 'ID' : 'Server' }}</span>
                  </div>

                  <!-- Name overlay -->
                  <div class="absolute bottom-0 left-0 right-0 p-4">
                    <h3 class="text-base sm:text-lg font-bold text-white group-hover:text-amber-300 transition-colors duration-300">
                      {{ game.name }}
                    </h3>
                  </div>
                </div>

                <!-- Bottom bar -->
                <div class="p-3.5 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-white/10 shrink-0">
                      <img :src="game.image_url" :alt="game.name" class="w-full h-full object-cover" />
                    </div>
                    <p class="text-xs text-white/50 font-mono truncate max-w-[100px]">{{ game.game_code }}</p>
                  </div>
                  <div class="flex items-center gap-1.5 text-white/30 group-hover:text-amber-300 transition-all duration-300">
                    <span class="text-[10px] font-medium hidden sm:inline">Top Up</span>
                    <svg class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── SEARCH + ALL GAMES ─── -->
        <div v-if="others.length > 0" ref="allGamesRef">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-primary-500"></div>
            <h2 class="text-lg font-bold text-white/90 uppercase tracking-wider">All Games</h2>
            <span class="text-xs text-white/30">({{ filteredOthers.length }} / {{ others.length }})</span>
          </div>

          <!-- Search Bar -->
          <div class="relative mb-5 max-w-md">
            <div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              placeholder="Search games by name, code..."
              class="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-primary-500/50 rounded-xl text-sm text-white/80 placeholder-white/25 outline-none transition-all duration-200 backdrop-blur-sm"
            />
            <!-- Clear button -->
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- No Results -->
          <div v-if="filteredOthers.length === 0 && searchQuery" class="text-center py-10">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-3">
              <svg class="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p class="text-sm text-white/30">No games matching "{{ searchQuery }}"</p>
          </div>

          <!-- Games Grid (filtered) -->
          <div v-if="filteredOthers.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            <div
              v-for="game in filteredOthers"
              :key="game.game_code"
              class="game-card"
            >
              <div
                @click="navigateToGame(game.game_code)"
                class="group relative cursor-pointer rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-0.5"
              >
                <div class="aspect-[4/3] overflow-hidden">
                  <img
                    :src="game.image_url"
                    :alt="game.name"
                    class="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                  <div class="absolute top-2 right-2 flex gap-0.5">
                    <span
                      v-for="field in game.game_fields"
                      :key="field"
                      class="px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[8px] font-medium text-white/60"
                    >{{ field === 'userid' ? 'ID' : 'SV' }}</span>
                  </div>
                </div>
                <div class="p-2.5">
                  <p class="text-xs font-semibold text-white/80 truncate group-hover:text-amber-300 transition-colors duration-200">
                    {{ game.name }}
                  </p>
                  <p class="text-[9px] text-white/30 font-mono truncate mt-0.5">{{ game.game_code }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── CTA / TRUST ─── -->
        <div ref="ctaRef" class="text-center">
          <div class="cta-el max-w-xl mx-auto p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
            <div class="flex items-center justify-center gap-2 mb-5">
              <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span class="text-xs text-white/30 uppercase tracking-widest font-medium">Trusted & Secure</span>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div class="text-center">
                <div class="w-9 h-9 mx-auto rounded-lg bg-blue-500/10 flex items-center justify-center mb-1.5">
                  <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p class="text-[10px] text-white/40">Secure<br/>KHQR Pay</p>
              </div>
              <div class="text-center">
                <div class="w-9 h-9 mx-auto rounded-lg bg-green-500/10 flex items-center justify-center mb-1.5">
                  <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p class="text-[10px] text-white/40">Instant<br/>Delivery</p>
              </div>
              <div class="text-center">
                <div class="w-9 h-9 mx-auto rounded-lg bg-amber-500/10 flex items-center justify-center mb-1.5">
                  <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p class="text-[10px] text-white/40">Best<br/>Prices</p>
              </div>
            </div>
          </div>

          <p class="cta-el mt-6 text-[10px] text-white/15">
            🇰🇭 Powered for Cambodian Gamers — KHQR Payment via Bakong
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.featured-card,
.game-card {
  animation: card-in 0.4s ease-out both;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
