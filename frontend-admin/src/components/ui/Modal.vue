<script setup lang="ts">
defineProps<{
  title?: string
  open: boolean
  maxWidth?: string
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="glass-overlay z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
        <Transition name="scale-in">
          <div
            v-if="open"
            class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[85vh] overflow-y-auto"
            :class="maxWidth ? `max-w-[${maxWidth}]` : ''"
          >
            <!-- Header -->
            <div v-if="title" class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
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

<style scoped>
.scale-in-enter-active { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
.scale-in-leave-active { transition: all 0.15s ease-in; }
.scale-in-enter-from { opacity: 0; transform: scale(0.95); }
.scale-in-leave-to { opacity: 0; transform: scale(0.95); }
</style>
