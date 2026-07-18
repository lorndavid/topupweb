<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'card' | 'product' | 'game-card' | 'featured-card' | 'list' | 'detail'
  count?: number
}>(), {
  variant: 'card',
  count: 6,
})
</script>

<template>
  <!-- ─── Product list skeleton (matches ProductCard layout) ─── -->
  <template v-if="variant === 'product'">
    <div class="space-y-3">
      <div
        v-for="i in count"
        :key="i"
        class="skeleton-item"
        :style="{ animationDelay: `${(i - 1) * 0.06}s` }"
      >
        <div class="flex items-center justify-between p-4 rounded-xl border-2 border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 skeleton-subtle">
          <!-- Left: name + code -->
          <div class="flex-1 min-w-0 space-y-2">
            <div class="h-4 w-2/3 rounded-md bg-surface-200 dark:bg-surface-700/80"></div>
            <div class="h-3 w-1/3 rounded-md bg-surface-200 dark:bg-surface-700/80"></div>
          </div>
          <!-- Right: price + currency -->
          <div class="ml-4 text-right shrink-0 space-y-1.5">
            <div class="h-5 w-16 ml-auto rounded-md bg-surface-200 dark:bg-surface-700/80"></div>
            <div class="h-3 w-8 ml-auto rounded-md bg-surface-200 dark:bg-surface-700/80"></div>
          </div>
        </div>
      </div>
    </div>
  </template>

  <!-- ─── Featured card skeleton (matches the featured/top-games cards with gradient overlay + bottom bar) ─── -->
  <template v-else-if="variant === 'featured-card'">
    <!-- Mobile: horizontal scroll (compact, matches new mobile card size) -->
    <div class="md:hidden flex overflow-x-auto gap-2.5 pb-2 -mx-4 px-4 snap-x snap-mandatory hide-scrollbar">
      <div
        v-for="i in count"
        :key="i"
        class="skeleton-item shrink-0 w-[42vw] sm:w-[36vw] snap-start"
        :style="{ animationDelay: `${(i - 1) * 0.08}s` }"
      >
        <div class="rounded-xl overflow-hidden bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700/80 skeleton-subtle">
          <!-- Image area with gradient overlay -->
          <div class="relative aspect-[4/3] bg-surface-200 dark:bg-surface-700/80">
            <div class="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
            <!-- Name placeholder overlay -->
            <div class="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
              <div class="h-3.5 w-3/4 rounded-md bg-white/30"></div>
            </div>
          </div>
          <!-- Bottom bar -->
          <div class="p-2 sm:p-2.5 flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-surface-200 dark:bg-surface-700/80"></div>
            </div>
            <div class="h-2.5 w-10 rounded-md bg-surface-200 dark:bg-surface-700/80"></div>
          </div>
        </div>
      </div>
    </div>
    <!-- Tablet+ : horizontal row -->
    <div class="hidden md:flex md:flex-row md:gap-4 md:overflow-x-auto md:pb-2">
      <div
        v-for="i in count"
        :key="i"
        class="skeleton-item shrink-0 md:w-[calc(25%_-_12px)]"
        :style="{ animationDelay: `${(i - 1) * 0.08}s` }"
      >
        <div class="rounded-2xl overflow-hidden bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700/80 skeleton-subtle">
          <div class="relative aspect-[4/3] bg-surface-200 dark:bg-surface-700/80">
            <div class="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
            <div class="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
              <div class="h-4 w-3/4 rounded-md bg-white/30"></div>
            </div>
          </div>
          <div class="p-3 sm:p-3.5 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-surface-200 dark:bg-surface-700/80"></div>
            </div>
            <div class="h-3 w-14 rounded-md bg-surface-200 dark:bg-surface-700/80"></div>
          </div>
        </div>
      </div>
    </div>
  </template>

  <!-- ─── Game card skeleton (matches simple all-games card: image + name) ─── -->
  <template v-else-if="variant === 'game-card'">
    <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
      <div
        v-for="i in count"
        :key="i"
        class="skeleton-item"
        :style="{ animationDelay: `${(i - 1) * 0.04}s` }"
      >
        <div class="rounded-xl overflow-hidden bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700/60 skeleton-subtle">
          <!-- Image placeholder -->
          <div class="aspect-[4/3] bg-surface-200 dark:bg-surface-700/80">
            <div class="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
          </div>
          <!-- Name placeholder -->
          <div class="p-2 sm:p-2.5">
            <div class="h-3.5 w-3/4 rounded-md bg-surface-200 dark:bg-surface-700/80"></div>
          </div>
        </div>
      </div>
    </div>
  </template>

  <!-- ─── Original card skeleton (default/game listing) ─── -->
  <template v-else-if="variant === 'card' || variant === 'list'">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="i in count"
        :key="i"
        class="skeleton-item card p-4 space-y-3 skeleton-subtle"
        :style="{ animationDelay: `${(i - 1) * 0.06}s` }"
      >
        <!-- Image placeholder -->
        <div class="w-full aspect-video rounded-xl bg-surface-200 dark:bg-surface-700/80"></div>
        <!-- Title placeholder -->
        <div class="h-4 w-3/4 rounded-md bg-surface-200 dark:bg-surface-700/80"></div>
        <!-- Description placeholder -->
        <div class="h-3 w-full rounded-md bg-surface-200 dark:bg-surface-700/80"></div>
        <div class="h-3 w-2/3 rounded-md bg-surface-200 dark:bg-surface-700/80"></div>
        <!-- Action placeholder -->
        <div class="h-10 w-full rounded-xl bg-surface-200 dark:bg-surface-700/80 mt-2"></div>
      </div>
    </div>
  </template>

  <!-- ─── Detail variant (header + list) ─── -->
  <template v-else-if="variant === 'detail'">
    <div class="space-y-6">
      <!-- Header skeleton -->
      <div class="flex items-center gap-4 p-6 card skeleton-subtle">
        <div class="w-20 h-20 rounded-2xl bg-surface-200 dark:bg-surface-700/80 shrink-0"></div>
        <div class="space-y-2 flex-1">
          <div class="h-6 w-1/3 rounded-md bg-surface-200 dark:bg-surface-700/80"></div>
          <div class="h-4 w-2/3 rounded-md bg-surface-200 dark:bg-surface-700/80"></div>
        </div>
      </div>
      <!-- Products skeleton (has its own stagger animation) -->
      <LoadingSkeleton variant="product" :count="count" />
    </div>
  </template>
</template>

<style scoped>
/* ─── Staggered fade-in for skeleton items ─── */
.skeleton-item {
  animation: skeleton-appear 0.4s ease-out both;
}

@keyframes skeleton-appear {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
