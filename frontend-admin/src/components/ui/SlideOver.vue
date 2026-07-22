<script setup lang="ts">
defineProps<{
  title?: string
  open: boolean
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="glass-overlay z-50" @click.self="$emit('close')">
        <Transition name="slide-right">
          <div
            v-if="open"
            class="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-slate-800 shadow-xl border-l border-slate-200 dark:border-slate-700 overflow-y-auto"
          >
            <!-- Header -->
            <div v-if="title" class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 class="text-base font-semibold text-slate-900 dark:text-white">{{ title }}</h3>
              <button
                class="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                @click="$emit('close')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="p-6">
              <slot />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
