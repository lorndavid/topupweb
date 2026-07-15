<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useGameStore } from '@/stores/game'
import { getCambodiaGames } from '@/services/api'
import type { GameCategory } from '@/types'
import gsap from 'gsap'

const i18n = useI18nStore()
const router = useRouter()
const gameStore = useGameStore()

const games = ref<GameCategory[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Staggered entrance refs
const heroRef = ref<HTMLElement | null>(null)
const introRef = ref<HTMLElement | null>(null)
const gridRef = ref<HTMLElement | null>(null)
const ctaRef = ref<HTMLElement | null>(null)
const particlesRef = ref<HTMLElement | null>(null)

// Game code to display metadata
const gameMeta: Record<string, { badge: string; players: string; gradient: string }> = {
  mlbb: {
    badge: 'Top Game 🇰🇭',
    players: '50M+ Players',
    gradient: 'from-blue-600 via-purple-600 to-pink-500',
  },
  freefire_sgmy: {
    badge: '🔥 Most Popular',
    players: '30M+ Players',
    gradient: 'from-orange-500 via-red-500 to-rose-600',
  },
  pubgm: {
    badge: '⚔️ Battle Royale',
    players: '25M+ Players',
    gradient: 'from-yellow-600 via-orange-500 to-red-600',
  },
  hok: {
    badge: '👑 MOBA King',
    players: '20M+ Players',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
  },
}

function navigateToGame(gameCode: string) {
  router.push(`/game/${gameCode}`)
}

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const data = await getCambodiaGames()
    games.value = data
    // Sync to store so GameDetail.vue can read game_fields (needsServerId, etc.)
    gameStore.categories = data
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load games'
  } finally {
    loading.value = false
  }
}

function animateEntrance() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

  // Hero section
  if (heroRef.value) {
    tl.fromTo(
      heroRef.value.querySelectorAll('.hero-el'),
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.12 }
    )
  }

  // Animated intro text
  if (introRef.value) {
    tl.fromTo(
      introRef.value,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5 },
      '-=0.15'
    )
  }

  // Game cards
  nextTick(() => {
    if (gridRef.value) {
      const cards = gridRef.value.querySelectorAll('.game-card-wrap')
      if (cards.length > 0) {
        tl.fromTo(
          cards,
          { opacity: 0, y: 40, scale: 0.92, rotateX: 5 },
          {
            opacity: 1, y: 0, scale: 1, rotateX: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'back.out(1.6)',
          },
          '-=0.1'
        )
      }
    }

    // CTA section
    if (ctaRef.value) {
      tl.fromTo(
        ctaRef.value.querySelectorAll('.cta-el'),
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 },
        '-=0.1'
      )
    }
  })

  // Floating particles animation
  if (particlesRef.value) {
    gsap.to(particlesRef.value.querySelectorAll('.particle'), {
      y: -40,
      duration: 4 + Math.random() * 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: 0.4,
    })
  }
}

onMounted(() => {
  fetchData()
  animateEntrance()
})
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <!-- ─── Background: Cambodia-inspired gradient ─── -->
    <div class="fixed inset-0 -z-10">
      <div class="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900"></div>
      <div class="absolute inset-0 opacity-30">
        <div class="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px]"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-red-600/15 blur-[120px]"></div>
        <div class="absolute top-[40%] right-[20%] w-[40%] h-[40%] rounded-full bg-amber-500/10 blur-[100px]"></div>
      </div>
    </div>

    <!-- Floating Background Particles -->
    <div ref="particlesRef" class="fixed inset-0 pointer-events-none -z-5">
      <div
        v-for="i in 8"
        :key="i"
        class="particle absolute w-1 h-1 rounded-full"
        :class="i % 3 === 0 ? 'bg-blue-400/40' : i % 3 === 1 ? 'bg-red-400/30' : 'bg-amber-400/30'"
        :style="{
          left: `${5 + (i * 12) % 90}%`,
          top: `${5 + (i * 17) % 90}%`,
          width: `${2 + (i % 3) * 2}px`,
          height: `${2 + (i % 3) * 2}px`,
          animationDelay: `${i * 0.6}s`,
        }"
      ></div>
    </div>

    <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14">
      <!-- ═══ HERO SECTION ═══ -->
      <div ref="heroRef" class="text-center mb-8 sm:mb-12 lg:mb-16">
        <!-- Cambodia Flag Badge -->
        <div class="hero-el inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-5">
          <span class="flex gap-0.5">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            <span class="w-2 h-2 rounded-full bg-red-500"></span>
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          </span>
          <span class="text-xs font-medium text-white/60 uppercase tracking-widest">🇰🇭 Cambodia Top-Up</span>
        </div>

        <!-- Main Title -->
        <h1 class="hero-el text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight">
          <span class="text-white">បញ្ចូលទឹកប្រាក់</span>
          <br class="sm:hidden" />
          <span class="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">ហ្គេមសំណព្វ</span>
        </h1>

        <!-- English Subtitle -->
        <p class="hero-el mt-4 text-base sm:text-lg text-white/50 max-w-xl mx-auto font-light tracking-wide">
          Fast & secure game top-ups for Cambodian gamers. 
          <span class="text-white/70 font-medium">KHQR Payment — Instant Delivery.</span>
        </p>

        <!-- Stats Row -->
        <div class="hero-el mt-6 flex items-center justify-center gap-6 sm:gap-10 text-center">
          <div>
            <p class="text-2xl sm:text-3xl font-bold text-white">4</p>
            <p class="text-xs text-white/40 mt-0.5">Top Games</p>
          </div>
          <div class="w-px h-10 bg-white/10"></div>
          <div>
            <p class="text-2xl sm:text-3xl font-bold text-white">KHQR</p>
            <p class="text-xs text-white/40 mt-0.5">Payment</p>
          </div>
          <div class="w-px h-10 bg-white/10"></div>
          <div>
            <p class="text-2xl sm:text-3xl font-bold text-white">Instant</p>
            <p class="text-xs text-white/40 mt-0.5">Delivery</p>
          </div>
        </div>
      </div>

      <!-- ═══ INTRO TEXT ═══ -->
      <div ref="introRef" class="text-center mb-8 sm:mb-10">
        <p class="text-sm text-white/30 uppercase tracking-[0.2em] font-medium">Choose Your Game</p>
      </div>

      <!-- ═══ LOADING STATE ═══ -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
        <div v-for="i in 4" :key="i" class="rounded-2xl overflow-hidden animate-pulse">
          <div class="aspect-[4/3] bg-white/5 rounded-2xl"></div>
          <div class="p-4 space-y-2">
            <div class="h-5 bg-white/10 rounded w-2/3"></div>
            <div class="h-3 bg-white/5 rounded w-1/3"></div>
          </div>
        </div>
      </div>

      <!-- ═══ ERROR STATE ═══ -->
      <div v-else-if="error" class="text-center py-16 max-w-md mx-auto">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-white/60 mb-4 text-sm">{{ error }}</p>
        <button @click="fetchData" class="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-medium backdrop-blur-sm border border-white/10 transition-all duration-200">
          Try Again
        </button>
      </div>

      <!-- ═══ GAMES GRID ═══ -->
      <div v-else ref="gridRef" class="max-w-4xl mx-auto">
        <div v-if="games.length === 0" class="text-center py-16">
          <p class="text-white/40">No games available at the moment.</p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          <div
            v-for="(game, idx) in games"
            :key="game.game_code"
            class="game-card-wrap"
          >
            <!-- Game Card -->
            <div
              @click="navigateToGame(game.game_code)"
              class="group relative cursor-pointer rounded-2xl overflow-hidden bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] transition-all duration-500 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1"
            >
              <!-- Card top: Image area with overlay gradient -->
              <div class="relative aspect-[4/3] overflow-hidden">
                <!-- Game Image -->
                <img
                  :src="game.image_url"
                  :alt="game.name"
                  class="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <!-- Dark overlay -->
                <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-80"></div>

                <!-- Top left: Badge -->
                <div class="absolute top-4 left-4">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md"
                    :class="{
                      'bg-blue-500/20 text-blue-300 border border-blue-400/20': game.game_code === 'mlbb',
                      'bg-orange-500/20 text-orange-300 border border-orange-400/20': game.game_code === 'freefire_sgmy',
                      'bg-yellow-500/20 text-yellow-300 border border-yellow-400/20': game.game_code === 'pubgm',
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-400/20': game.game_code === 'hok',
                    }"
                  >
                    <span class="w-1.5 h-1.5 rounded-full animate-pulse"
                      :class="{
                        'bg-blue-400': game.game_code === 'mlbb',
                        'bg-orange-400': game.game_code === 'freefire_sgmy',
                        'bg-yellow-400': game.game_code === 'pubgm',
                        'bg-emerald-400': game.game_code === 'hok',
                      }"
                    ></span>
                    {{ gameMeta[game.game_code]?.badge || 'Available' }}
                  </span>
                </div>

                <!-- Top right: Field hints -->
                <div class="absolute top-4 right-4 flex gap-1.5">
                  <span
                    v-for="field in game.game_fields"
                    :key="field"
                    class="px-2 py-1 bg-black/40 backdrop-blur-sm rounded-lg text-[10px] font-medium text-white/80 uppercase tracking-wider"
                  >
                    {{ field === 'userid' ? 'User ID' : 'Server ID' }}
                  </span>
                </div>

                <!-- Bottom overlay: Game name -->
                <div class="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                  <h3 class="text-lg sm:text-xl font-bold text-white group-hover:text-amber-300 transition-colors duration-300">
                    {{ game.name }}
                  </h3>
                  <p class="mt-1 text-xs text-white/50 line-clamp-1">
                    {{ game.description }}
                  </p>
                </div>
              </div>

              <!-- Card bottom: Info bar -->
              <div class="p-4 sm:p-5 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg overflow-hidden ring-2 ring-white/10 shrink-0">
                    <img
                      :src="game.image_url"
                      :alt="game.name"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-white/90">{{ game.name }}</p>
                    <p class="text-[10px] text-white/40 uppercase tracking-wider">{{ game.game_code }}</p>
                  </div>
                </div>

                <!-- CTA Arrow -->
                <div class="flex items-center gap-2 text-white/40 group-hover:text-amber-300 transition-all duration-300">
                  <span class="text-xs font-medium hidden sm:inline">Top Up</span>
                  <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>

              <!-- Animated gradient border on hover -->
              <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                :class="{
                  'bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10': game.game_code === 'mlbb',
                  'bg-gradient-to-br from-orange-500/10 via-transparent to-red-500/10': game.game_code === 'freefire_sgmy',
                  'bg-gradient-to-br from-yellow-500/10 via-transparent to-red-500/10': game.game_code === 'pubgm',
                  'bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10': game.game_code === 'hok',
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ TRUSTED / CTA SECTION ═══ -->
      <div ref="ctaRef" class="mt-14 sm:mt-20 text-center">
        <div class="cta-el max-w-xl mx-auto p-6 sm:p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
          <div class="flex items-center justify-center gap-3 mb-4">
            <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span class="text-sm text-white/40 uppercase tracking-widest font-medium">Trusted & Secure</span>
          </div>

          <div class="grid grid-cols-3 gap-4 sm:gap-6">
            <div class="text-center">
              <div class="w-10 h-10 mx-auto rounded-xl bg-blue-500/10 flex items-center justify-center mb-2">
                <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p class="text-xs text-white/50">Secure<br/>KHQR Pay</p>
            </div>
            <div class="text-center">
              <div class="w-10 h-10 mx-auto rounded-xl bg-green-500/10 flex items-center justify-center mb-2">
                <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p class="text-xs text-white/50">Instant<br/>Delivery</p>
            </div>
            <div class="text-center">
              <div class="w-10 h-10 mx-auto rounded-xl bg-amber-500/10 flex items-center justify-center mb-2">
                <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-xs text-white/50">Best<br/>Prices</p>
            </div>
          </div>
        </div>

        <!-- Cambodia Copyright -->
        <p class="cta-el mt-8 text-xs text-white/20">
          🇰🇭 Powered for Cambodian Gamers — KHQR Payment via Bakong
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth card appearance */
.game-card-wrap {
  animation: card-appear 0.6s ease-out both;
}

@keyframes card-appear {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

</style>
