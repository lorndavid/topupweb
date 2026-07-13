<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useI18nStore } from '@/stores/i18n'
import GameCard from '@/components/GameCard.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'

const gameStore = useGameStore()
const i18n = useI18nStore()

const searchQuery = ref('')
const selectedFilter = ref<string | null>(null)

const popularFilters = [
  { label: 'Mobile Legends', code: 'mlbb' },
  { label: 'Free Fire', code: 'freefire' },
  { label: 'PUBG', code: 'pubg' },
  { label: 'Valorant', code: 'valorant' },
  { label: 'Blood Strike', code: 'bloodstrike' },
  { label: 'Honor of Kings', code: 'hok' },
]

const filteredGames = computed(() => {
  let games = gameStore.categories

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    games = games.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.game_code.toLowerCase().includes(q)
    )
  }

  if (selectedFilter.value) {
    games = games.filter((g) =>
      g.game_code.startsWith(selectedFilter.value!)
    )
  }

  return games
})

function setFilter(code: string | null) {
  selectedFilter.value = selectedFilter.value === code ? null : code
  searchQuery.value = ''
}

function clearSearch() {
  searchQuery.value = ''
  selectedFilter.value = null
}

onMounted(() => {
  gameStore.fetchCategories()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Hero Section -->
    <div class="text-center mb-10 animate-fade-in">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 rounded-full text-xs font-medium text-primary-600 dark:text-primary-400 mb-4">
        <span class="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
        {{ gameStore.categories.length || '204' }}+ {{ i18n.t('hero.badge') }}
      </div>
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-surface-900 dark:text-surface-50 tracking-tight">
        {{ i18n.t('hero.title') }}
        <span class="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">{{ i18n.t('hero.titleHighlight') }}</span>
      </h1>
      <p class="mt-4 text-lg text-surface-500 dark:text-surface-400 max-w-2xl mx-auto">
        {{ i18n.t('hero.subtitle') }}
      </p>
      <div class="mt-6 flex items-center justify-center gap-6 text-sm text-surface-400 dark:text-surface-500">
        <span class="flex items-center gap-1.5">
          <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Instant Delivery
        </span>
        <span class="flex items-center gap-1.5">
          <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Secure Payment
        </span>
        <span class="flex items-center gap-1.5">
          <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Best Prices
        </span>
      </div>
    </div>

    <!-- Search & Filter -->
    <div class="mb-8 space-y-4">
      <div class="relative max-w-md mx-auto">
        <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="i18n.t('search.placeholder')"
          class="input-field pl-12 pr-10"
        />
        <button
          v-if="searchQuery || selectedFilter"
          @click="clearSearch"
          class="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-all"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Filter Chips -->
      <div class="flex flex-wrap items-center justify-center gap-2">
        <button
          @click="clearSearch"
          :class="[
            'px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200',
            !selectedFilter && !searchQuery
              ? 'bg-primary-500 text-white border-primary-500 shadow-sm shadow-primary-500/20'
              : 'bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-400 border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-600'
          ]"
        >
          {{ i18n.t('search.all') }}
        </button>
        <button
          v-for="f in popularFilters"
          :key="f.code"
          @click="setFilter(f.code)"
          :class="[
            'px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200',
            selectedFilter === f.code
              ? 'bg-primary-500 text-white border-primary-500 shadow-sm shadow-primary-500/20'
              : 'bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-400 border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-600'
          ]"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Categories Grid -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-100">
          {{ selectedFilter ? popularFilters.find(f => f.code === selectedFilter)?.label || i18n.t('home.games') : i18n.t('home.popularGames') }}
        </h2>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-surface-400 dark:text-surface-500">
            <template v-if="searchQuery || selectedFilter">
              {{ filteredGames.length }} {{ i18n.t('search.of') }} {{ gameStore.categories.length }}
            </template>
            <template v-else>
              {{ gameStore.categories.length }}
            </template>
            {{ i18n.t('search.games') }}
          </span>
        </div>
      </div>

      <!-- Loading State -->
      <LoadingSkeleton v-if="gameStore.loading" />

      <!-- Error State -->
      <div v-else-if="gameStore.error" class="text-center py-16">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-surface-500 dark:text-surface-400 mb-4">{{ gameStore.error }}</p>
        <button @click="gameStore.fetchCategories()" class="btn-primary text-sm">{{ i18n.t('common.tryAgain') }}</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="!gameStore.categories.length && !gameStore.loading" class="text-center py-16">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 mb-4">
          <svg class="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p class="text-surface-500 dark:text-surface-400">{{ i18n.t('search.noGames') }}</p>
      </div>

      <!-- Games Grid -->
      <div v-else>
        <div v-if="filteredGames.length === 0" class="text-center py-16 animate-fade-in">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 mb-4">
            <svg class="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p class="text-surface-500 dark:text-surface-400 mb-2">{{ i18n.t('search.noResults') }} "{{ searchQuery }}"</p>
          <button @click="clearSearch" class="text-sm text-primary-500 hover:text-primary-600 font-medium">{{ i18n.t('search.clearSearch') }}</button>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="game in filteredGames" :key="game.game_code" class="animate-fade-in">
            <GameCard :game="game" />
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="mt-20 mb-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="text-center p-6 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/20 text-primary-500 mb-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 class="font-semibold text-surface-900 dark:text-surface-100 mb-2">{{ i18n.t('features.instantDelivery.title') }}</h3>
          <p class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('features.instantDelivery.desc') }}</p>
        </div>
        <div class="text-center p-6 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-500 mb-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 class="font-semibold text-surface-900 dark:text-surface-100 mb-2">{{ i18n.t('features.securePayment.title') }}</h3>
          <p class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('features.securePayment.desc') }}</p>
        </div>
        <div class="text-center p-6 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/20 text-amber-500 mb-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="font-semibold text-surface-900 dark:text-surface-100 mb-2">{{ i18n.t('features.bestPrices.title') }}</h3>
          <p class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('features.bestPrices.desc') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
