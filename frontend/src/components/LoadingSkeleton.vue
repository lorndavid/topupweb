<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'card' | 'product' | 'game-card' | 'list' | 'detail'
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
        class="skeleton-product-card"
      >
        <div class="flex items-center justify-between p-4 rounded-xl border-2 border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
          <!-- Left: name + code -->
          <div class="flex-1 min-w-0 space-y-2">
            <div class="skeleton-shimmer h-4 w-2/3"></div>
            <div class="skeleton-shimmer h-3 w-1/3"></div>
          </div>
          <!-- Right: price + currency -->
          <div class="ml-4 text-right shrink-0 space-y-1.5">
            <div class="skeleton-shimmer h-5 w-16 ml-auto"></div>
            <div class="skeleton-shimmer h-3 w-8 ml-auto"></div>
          </div>
        </div>
      </div>
    </div>
  </template>

  <!-- ─── Game card skeleton (matches GameCard / featured card layout) ─── -->
  <template v-else-if="variant === 'game-card'">
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
      <div
        v-for="i in count"
        :key="i"
        class="rounded-xl overflow-hidden bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700/60"
      >
        <!-- Image placeholder with shimmer -->
        <div class="aspect-[4/3] skeleton-shimmer rounded-none">
          <!-- Gradient overlay to mimic the real card -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
        </div>
        <!-- Info area -->
        <div class="p-2.5 space-y-2">
          <div class="skeleton-shimmer h-3.5 w-3/4"></div>
          <div class="skeleton-shimmer h-2.5 w-1/2"></div>
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
        class="card p-4 space-y-3 animate-pulse"
      >
        <!-- Image placeholder -->
        <div class="w-full aspect-video rounded-xl skeleton"></div>
        <!-- Title placeholder -->
        <div class="h-4 skeleton w-3/4"></div>
        <!-- Description placeholder -->
        <div class="h-3 skeleton w-full"></div>
        <div class="h-3 skeleton w-2/3"></div>
        <!-- Action placeholder -->
        <div class="h-10 skeleton w-full mt-2"></div>
      </div>
    </div>
  </template>

  <!-- ─── Detail variant (header + list) ─── -->
  <template v-else-if="variant === 'detail'">
    <div class="space-y-6">
      <!-- Header skeleton -->
      <div class="flex items-center gap-4 p-6 card">
        <div class="w-20 h-20 rounded-2xl skeleton animate-pulse shrink-0"></div>
        <div class="space-y-2 flex-1">
          <div class="h-6 skeleton animate-pulse w-1/3"></div>
          <div class="h-4 skeleton animate-pulse w-2/3"></div>
        </div>
      </div>
      <!-- Products skeleton (has its own stagger animation) -->
      <LoadingSkeleton variant="product" :count="count" />
    </div>
  </template>
</template>

<style scoped>
.skeleton-product-card {
  animation: skeleton-fade 1.5s ease-in-out infinite;
}

@keyframes skeleton-fade {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

/* Stagger the fade per card — up to 12 cards for all-games grid */
.skeleton-product-card:nth-child(1) { animation-delay: 0s; }
.skeleton-product-card:nth-child(2) { animation-delay: 0.08s; }
.skeleton-product-card:nth-child(3) { animation-delay: 0.16s; }
.skeleton-product-card:nth-child(4) { animation-delay: 0.24s; }
.skeleton-product-card:nth-child(5) { animation-delay: 0.32s; }
.skeleton-product-card:nth-child(6) { animation-delay: 0.40s; }
.skeleton-product-card:nth-child(7) { animation-delay: 0.48s; }
.skeleton-product-card:nth-child(8) { animation-delay: 0.56s; }
.skeleton-product-card:nth-child(9) { animation-delay: 0.64s; }
.skeleton-product-card:nth-child(10) { animation-delay: 0.72s; }
.skeleton-product-card:nth-child(11) { animation-delay: 0.80s; }
.skeleton-product-card:nth-child(12) { animation-delay: 0.88s; }
</style>
