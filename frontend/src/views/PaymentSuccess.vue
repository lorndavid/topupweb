<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const reference = ref(route.query.reference as string || '')

onMounted(() => {
  if (reference.value) {
    toast.success('Payment successful! Redirecting to order status...')
    setTimeout(() => {
      router.push(`/order/${reference.value}`)
    }, 2000)
  }
})
</script>

<template>
  <div class="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center animate-fade-in">
    <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/20 mb-6">
      <svg class="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-100 mb-3">Payment Successful!</h1>
    <p class="text-surface-500 dark:text-surface-400 mb-6">
      Your payment has been received. Redirecting to order status...
    </p>
    <div class="w-8 h-8 mx-auto border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
    <p v-if="reference" class="mt-4 text-sm text-surface-400 dark:text-surface-500 font-mono">
      Reference: {{ reference }}
    </p>
  </div>
</template>
