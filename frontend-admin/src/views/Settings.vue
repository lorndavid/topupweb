<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/ui/AppIcon.vue'

const toast = useToastStore()
const auth = useAuthStore()

// General settings
const storeName = ref('VidTopUp')
const adminUsername = ref(localStorage.getItem('admin_username') || 'admin')
const adminPassword = ref('')

// API key (real from localStorage)
const bay2gameApiKey = ref(localStorage.getItem('admin_api_key') || '')
const bakongToken = ref('••••••••••••••••')
const telegramBotToken = ref('')

function saveGeneral() {
  toast.success('Settings saved', 'General settings have been updated')
}

function saveApiKey() {
  if (bay2gameApiKey.value) {
    localStorage.setItem('admin_api_key', bay2gameApiKey.value)
    toast.success('API key saved', 'Your Bay2Game API key has been saved locally')
  } else {
    localStorage.removeItem('admin_api_key')
    toast.warning('API key removed', 'Your Bay2Game API key has been cleared')
  }
}

function saveNotifications() {
  toast.success('Notification settings saved')
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold font-heading text-slate-900 dark:text-white">Settings</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure your store and API settings</p>
      </div>
    </div>

    <div class="space-y-6 max-w-2xl">
      <!-- Bay2Game Profile Summary -->
      <div v-if="auth.isApiKeyLogin && auth.bay2gameBalance !== null" class="card p-5 bg-gradient-to-r from-primary-50/50 to-success-50/50 dark:from-primary-500/5 dark:to-success-500/5 border-primary-200 dark:border-primary-700/30">
        <h2 class="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><AppIcon name="gamepad" :size="16" class="text-primary-500" />Bay2Game Account</h2>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <p class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Username</p>
            <p class="text-sm font-semibold text-slate-900 dark:text-white mt-1">{{ auth.username }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Balance</p>
            <p class="text-sm font-semibold text-success-600 dark:text-success-400 mt-1">${{ auth.bay2gameBalance?.toFixed(2) }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Orders</p>
            <p class="text-sm font-semibold text-slate-900 dark:text-white mt-1">{{ auth.bay2gameTotalOrders }}</p>
          </div>
        </div>
        <p class="text-xs text-slate-400 mt-3">Logged in via API Key</p>
      </div>

      <!-- General Settings -->
      <div class="card p-6">
        <h2 class="text-sm font-semibold text-slate-900 dark:text-white mb-1">General Settings</h2>
        <p class="text-xs text-slate-400 mb-4">Basic store information</p>
        <div class="space-y-4">
          <div>
            <label class="form-label">Store Name</label>
            <input v-model="storeName" type="text" class="form-input" />
          </div>
          <div>
            <label class="form-label">Admin Username</label>
            <input v-model="adminUsername" type="text" class="form-input" />
          </div>
          <div>
            <label class="form-label">Change Password</label>
            <input v-model="adminPassword" type="password" class="form-input" placeholder="Leave blank to keep current" />
          </div>
          <button class="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors" @click="saveGeneral">
            Save Changes
          </button>
        </div>
      </div>

      <!-- API Configuration -->
      <div class="card p-6">
        <h2 class="text-sm font-semibold text-slate-900 dark:text-white mb-1">API Configuration</h2>
        <p class="text-xs text-slate-400 mb-4">Integration credentials for external services</p>
        <div class="space-y-4">
          <div>
            <label class="form-label">Bay2Game API Key</label>
            <input v-model="bay2gameApiKey" type="password" class="form-input font-mono text-xs" placeholder="Enter your Bay2Game API key" />
            <p class="form-help">Required for fetching product prices and processing orders. Save this, then re-login with API Key to refresh your profile.</p>
          </div>
          <div>
            <label class="form-label">Bakong API Token</label>
            <input v-model="bakongToken" type="password" class="form-input font-mono" disabled />
            <p class="form-help">Configured via the backend .env file (BAKONG_API_TOKEN)</p>
          </div>
          <button class="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors" @click="saveApiKey">
            Save API Key
          </button>
        </div>
      </div>

      <!-- Notifications -->
      <div class="card p-6">
        <h2 class="text-sm font-semibold text-slate-900 dark:text-white mb-1">Notifications</h2>
        <p class="text-xs text-slate-400 mb-4">Telegram bot and push notification configuration</p>
        <div class="space-y-4">
          <div>
            <label class="form-label">Telegram Bot Token</label>
            <input v-model="telegramBotToken" type="password" class="form-input font-mono" placeholder="Enter bot token" disabled />
            <p class="form-help">Configured via the backend .env file (TELEGRAM_BOT_TOKEN)</p>
          </div>
          <button class="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors" @click="saveNotifications">
            Save Notification Settings
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
