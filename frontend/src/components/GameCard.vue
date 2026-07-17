<script setup lang="ts">
import type { GameCategory } from '@/types'

const props = defineProps<{
  game: GameCategory
}>()
</script>

<template>
  <router-link
    :to="`/game/${game.game_code}`"
    class="group relative cursor-pointer rounded-xl overflow-hidden bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700/60 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 block"
  >
    <!-- Image -->
    <div class="aspect-[4/3] overflow-hidden">
      <img
        :src="game.image_url"
        :alt="game.name"
        class="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
    </div>

    <!-- Game Name -->
    <div class="p-2 sm:p-2.5">
      <p class="text-xs sm:text-[13px] font-semibold text-surface-800 dark:text-surface-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
        {{ game.name }}
      </p>
    </div>
  </router-link>
</template>
