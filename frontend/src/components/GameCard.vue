<script setup lang="ts">
import type { GameCategory } from '@/types'

const props = defineProps<{
  game: GameCategory
}>()
</script>

<template>
  <router-link
    :to="`/game/${game.game_code}`"
    class="card group overflow-hidden p-0 cursor-pointer block hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
  >
    <!-- Image -->
    <div class="relative aspect-video overflow-hidden bg-surface-100 dark:bg-surface-800">
      <img
        :src="game.image_url"
        :alt="game.name"
        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        loading="lazy"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
      <!-- Badge -->
      <div class="absolute top-3 left-3">
        <span class="px-2.5 py-1 bg-white/90 dark:bg-surface-900/90 backdrop-blur-sm rounded-lg text-xs font-semibold text-surface-700 dark:text-surface-200">
          {{ game.game_code }}
        </span>
      </div>
      <!-- Game fields hint -->
      <div class="absolute top-3 right-3 flex gap-1.5">
        <span
          v-for="field in game.game_fields"
          :key="field"
          class="px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-[10px] font-medium text-white uppercase tracking-wider"
        >
          {{ field === 'userid' ? 'ID' : 'Server' }}
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4">
      <h3 class="font-semibold text-surface-900 dark:text-surface-100 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
        {{ game.name }}
      </h3>
      <p class="mt-1.5 text-sm text-surface-500 dark:text-surface-400 line-clamp-2">
        {{ game.description }}
      </p>
      <div class="mt-3 flex items-center justify-between">
        <span class="text-xs text-surface-400 dark:text-surface-500">
          Available
        </span>
        <span class="inline-flex items-center gap-1 text-sm font-medium text-primary-500 dark:text-primary-400 group-hover:gap-2 transition-all">
          Top Up
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  </router-link>
</template>
