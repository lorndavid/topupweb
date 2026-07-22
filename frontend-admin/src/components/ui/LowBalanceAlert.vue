<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import adminApi from '@/services/api'
import AppIcon from '@/components/ui/AppIcon.vue'

const router = useRouter()
const balance = ref<number | null>(null)
const threshold = ref(10)
const isLow = ref(false)
const message = ref('')
const loading = ref(true)
const dismissed = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

async function checkBalance() {
  // Skip if there's no auth token — prevents 401 redirect loop on login page
  const token = localStorage.getItem('admin_token')
  if (!token) {
    loading.value = false
    return
  }

  try {
    const result = await adminApi.getBalanceAlert()
    balance.value = result.balance
    threshold.value = result.threshold
    isLow.value = result.isLow
    message.value = result.message
    // Re-show banner if balance drops low again after being dismissed
    if (result.isLow) {
      dismissed.value = false
    }
  } catch {
    // Silently fail — banner is non-critical
  } finally {
    loading.value = false
  }
}

function dismiss() {
  dismissed.value = true
}

function goToFunding() {
  router.push('/funding-history')
}

onMounted(() => {
  checkBalance()
  // Poll every 60 seconds to keep balance in check
  pollTimer = setInterval(checkBalance, 60000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <Transition name="alert-slide">
    <div
      v-if="isLow && !dismissed && !loading"
      class="bg-red-50 dark:bg-red-500/10 border-b border-red-200 dark:border-red-500/20 transition-all duration-300"
    >
      <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        <!-- Icon -->
        <div class="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <AppIcon name="warning" :size="16" class="text-red-600 dark:text-red-400" />
        </div>

        <!-- Message -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-red-800 dark:text-red-200">
            <span class="font-bold">Low Balance!</span>
            {{ balance !== null ? ` $${balance?.toFixed(2)} remaining` : '' }}
          </p>
          <p class="text-xs text-red-600/80 dark:text-red-300/80 mt-0.5">
            {{ balance !== null ? `Your Bay2Game wallet has $${balance?.toFixed(2)}. Orders will fail when it reaches $0.` : '' }}
            <button
              class="ml-1 font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
              @click="goToFunding"
            >
              View funding history →
            </button>
          </p>
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <a
            href="https://bay2game.xyz/partners/login.php"
            target="_blank"
            rel="noopener noreferrer"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 transition-colors shadow-sm shadow-red-600/20"
          >
            Top Up Now
          </a>
          <button
            class="p-1.5 rounded-lg text-red-500 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
            @click="dismiss"
            aria-label="Dismiss balance alert"
          >
            <AppIcon name="x" :size="16" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.alert-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.alert-slide-leave-active {
  transition: all 0.25s ease-in;
}
.alert-slide-enter-from {
  opacity: 0;
  max-height: 0;
  transform: translateY(-100%);
  padding-top: 0;
  padding-bottom: 0;
  overflow: hidden;
}
.alert-slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  overflow: hidden;
}
</style>
