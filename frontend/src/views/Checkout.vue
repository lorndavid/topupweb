<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useI18nStore } from '@/stores/i18n'
import { useToastStore } from '@/stores/toast'
import type { TranslationKey } from '@/i18n/translations'

const router = useRouter()
const gameStore = useGameStore()
const i18n = useI18nStore()
const toast = useToastStore()
const processing = ref(false)

const order = computed(() => gameStore.currentOrder)

// Helper functions (shared with GameDetail.vue)
function providerLabel(provider: string): string {
  const key = `verify.provider.${provider}` as TranslationKey
  const label = i18n.t(key)
  return label === key ? provider : label
}

function providerTooltip(provider: string): string {
  const tooltipKey = `verify.provider.tooltip.${provider}` as TranslationKey
  const tooltip = i18n.t(tooltipKey)
  return tooltip === tooltipKey
    ? `${i18n.t('verify.provider.prefix')} ${providerLabel(provider)}`
    : tooltip
}

function isRealProvider(provider: string | null | undefined): boolean {
  return !!provider && provider !== 'simulated'
}

if (!order.value) {
  router.replace('/')
}

async function proceedToPayment() {
  if (!order.value) return

  processing.value = true
  try {
    router.push('/payment')
  } catch (err) {
    toast.error(i18n.t('checkout.toast.proceedError'))
    processing.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Back Button -->
    <button
      @click="router.back()"
      class="inline-flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-6 transition-colors"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>

    <div class="animate-fade-in" v-if="order">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-100">{{ i18n.t('checkout.title') }}</h1>
        <p class="mt-1 text-surface-500 dark:text-surface-400">{{ i18n.t('checkout.subtitle') }}</p>
      </div>

      <!-- Order Details -->
      <div class="card p-6 space-y-5">
        <!-- Game Info -->
        <div class="flex items-center gap-4 pb-5 border-b border-surface-200 dark:border-surface-700">
          <div class="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
            <svg class="w-7 h-7 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('checkout.game') }}</p>
            <p class="font-semibold text-surface-900 dark:text-surface-100">{{ order.gameName }}</p>
          </div>
        </div>

        <!-- Package -->
        <div class="flex items-center justify-between pb-5 border-b border-surface-200 dark:border-surface-700">
          <div>
            <p class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('checkout.package') }}</p>
            <p class="font-semibold text-surface-900 dark:text-surface-100">{{ order.productName }}</p>
          </div>
          <span class="text-lg font-bold text-primary-500 dark:text-primary-400">
            ${{ order.amount.toFixed(2) }}
          </span>
        </div>

        <!-- Player ID -->
        <div class="flex items-center justify-between pb-5 border-b border-surface-200 dark:border-surface-700">
          <div class="min-w-0">
            <p class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('checkout.playerId') }}</p>
            <p class="font-mono font-semibold text-surface-900 dark:text-surface-100">{{ order.playerId }}</p>
            <!-- Provider badge -->
            <span
              v-if="order.verifyProvider"
              :title="providerTooltip(order.verifyProvider)"
              class="group inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full cursor-help"
              :class="isRealProvider(order.verifyProvider)
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'"
            >
              <!-- Dot indicator -->
              <span
                class="w-1.5 h-1.5 rounded-full shrink-0"
                :class="isRealProvider(order.verifyProvider)
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'"
              ></span>
              {{ i18n.t('verify.provider.prefix') }} {{ providerLabel(order.verifyProvider) }}
              <!-- Info icon -->
              <svg
                class="w-3 h-3 shrink-0 transition-colors duration-200"
                :class="isRealProvider(order.verifyProvider)
                  ? 'text-emerald-400 dark:text-emerald-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-300'
                  : 'text-amber-400 dark:text-amber-500 group-hover:text-amber-600 dark:group-hover:text-amber-300'"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                />
              </svg>
            </span>
          </div>
          <button class="text-xs text-primary-500 hover:text-primary-600 font-medium shrink-0">
            {{ i18n.t('checkout.edit') }}
          </button>
        </div>

        <!-- Server ID (if present) -->
        <div v-if="order.serverId" class="flex items-center justify-between pb-5 border-b border-surface-200 dark:border-surface-700">
          <div>
            <p class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('checkout.serverId') }}</p>
            <p class="font-mono font-semibold text-surface-900 dark:text-surface-100">{{ order.serverId }}</p>
          </div>
        </div>

        <!-- Total -->
        <div class="flex items-center justify-between pt-2">
          <p class="text-lg font-semibold text-surface-900 dark:text-surface-100">{{ i18n.t('checkout.total') }}</p>
          <p class="text-2xl font-bold text-primary-500 dark:text-primary-400">
            ${{ order.amount.toFixed(2) }}
          </p>
        </div>

        <!-- Payment Info -->
        <div class="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl text-xs text-amber-700 dark:text-amber-400">
          <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
          <p>{{ i18n.t('checkout.paymentInfo') }}</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          @click="router.back()"
          class="btn-secondary flex-1"
        >
          {{ i18n.t('checkout.cancel') }}
        </button>
        <button
          @click="proceedToPayment"
          :disabled="processing"
          class="btn-primary flex-1"
        >
          <svg v-if="processing" class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ processing ? i18n.t('checkout.processing') : i18n.t('checkout.proceedPayment') }}
        </button>
      </div>
    </div>
  </div>
</template>
