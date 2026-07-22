<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import adminApi from '@/services/api'
import AppIcon from '@/components/ui/AppIcon.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'

const toast = useToastStore()
const loading = ref(true)
const testing = ref(false)
const origin = ref(window.location.origin)
const webhookData = ref<{
  bakongCallbackUrl: string
  bakongReturnUrl: string
  bay2gameNote: string
} | null>(null)

async function fetchWebhooks() {
  loading.value = true
  try {
    const res = await adminApi.getWebhookConfig()
    webhookData.value = res as any
  } catch (err) {
    toast.error('Failed to load webhook config', err instanceof Error ? err.message : '')
  } finally {
    loading.value = false
  }
}

async function handleTestWebhook() {
  testing.value = true
  try {
    await adminApi.testWebhook()
    toast.success('Test webhook sent', 'Check your backend logs for the test payload')
  } catch (err) {
    toast.error('Failed to send test webhook', err instanceof Error ? err.message : '')
  } finally {
    testing.value = false
  }
}

onMounted(fetchWebhooks)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold font-heading text-slate-900 dark:text-white">Webhooks</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your webhook endpoints for order and payment notifications</p>
      </div>
    </div>

    <div v-if="loading" class="space-y-4">
      <LoadingSkeleton v-for="i in 2" :key="i" type="card" />
    </div>

    <template v-if="webhookData">
      <div class="space-y-6 max-w-2xl">
        <!-- Bakong Callback -->
        <div class="card p-6">
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2"><AppIcon name="link" :size="16" />Bakong Payment Callback</h2>
          <p class="text-xs text-slate-400 mb-4">Bakong sends payment confirmation to this URL</p>
          <div class="space-y-3">
            <div>
              <label class="form-label">Callback URL</label>
              <input :value="webhookData.bakongCallbackUrl" type="text" class="form-input font-mono text-xs" readonly />
              <p class="form-help">Configured in backend .env as <code>BAKONG_CALLBACK_URL</code></p>
            </div>
            <div>
              <label class="form-label">Return URL</label>
              <input :value="webhookData.bakongReturnUrl" type="text" class="form-input font-mono text-xs" readonly />
              <p class="form-help">Configured in backend .env as <code>BAKONG_RETURN_URL</code></p>
            </div>
            <button
              class="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              :disabled="testing"
              @click="handleTestWebhook"
            >
              <span v-if="testing" class="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              {{ testing ? 'Sending...' : 'Send Test Payload' }}
            </button>
          </div>
        </div>

        <!-- Bay2Game -->
        <div class="card p-6">
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2"><AppIcon name="gamepad" :size="16" />Bay2Game Webhooks</h2>
          <p class="text-xs text-slate-400 mb-4">Order status updates from Bay2Game</p>
          <div class="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-sm text-slate-600 dark:text-slate-400">
            <div class="flex items-start gap-3">
              <AppIcon name="info" :size="20" class="flex-shrink-0 text-info-500" />
              <div>
                <p>{{ webhookData.bay2gameNote }}</p>
                <a
                  href="https://bay2game.xyz/partners/login.php"
                  target="_blank"
                  class="inline-flex items-center gap-1 mt-2 text-primary-600 dark:text-primary-400 hover:underline text-xs"
                >
                  Open Bay2Game Partner Dashboard →
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Stock Alert Webhook -->
        <div class="card p-6">
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2"><AppIcon name="orders" :size="16" />Local Stock Alert Webhook</h2>
          <p class="text-xs text-slate-400 mb-4">The backend already listens for stock alerts from your local systems</p>
          <div class="space-y-3">
            <div>
              <label class="form-label">Local Webhook Endpoint</label>
              <input
                :value="`${origin}/api/webhook/stock-alert`"
                type="text"
                class="form-input font-mono text-xs"
                readonly
              />
              <p class="form-help">This endpoint receives Bay2Game stock alert callbacks</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
