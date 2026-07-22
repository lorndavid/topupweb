<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/ui/AppIcon.vue'

const auth = useAuthStore()

// Tab
const activeTab = ref<'password' | 'apikey'>('password')

// Password form
const username = ref('')
const password = ref('')

// API Key form
const apiKey = ref('')

function handlePasswordLogin() {
  if (!username.value || !password.value) return
  auth.login({ username: username.value, password: password.value })
}

function handleApiKeyLogin() {
  if (!apiKey.value) return
  auth.loginWithApiKey(apiKey.value)
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-50 to-primary-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-primary-950/20 p-4">
    <div class="w-full max-w-sm">
      <!-- Brand -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white text-xl font-bold shadow-lg shadow-primary-500/20 mb-4">
          VT
        </div>
        <h1 class="text-xl font-bold font-heading text-slate-900 dark:text-white">VidTopUp Admin</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in to manage your store</p>
      </div>

      <!-- Login card -->
      <div class="card p-6">
        <!-- Error message -->
        <div v-if="auth.error" class="mb-4 px-4 py-3 bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20 rounded-xl text-sm text-danger-700 dark:text-danger-400">
          {{ auth.error }}
        </div>

        <!-- Tab switcher -->
        <div class="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mb-5">
          <button
            class="flex-1 py-2 text-xs font-medium rounded-md transition-all duration-150 inline-flex items-center justify-center gap-1.5"
            :class="activeTab === 'password' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'"
            @click="activeTab = 'password'"
          >
            <AppIcon name="lock" :size="14" class="-ml-0.5" />
            Password
          </button>
          <button
            class="flex-1 py-2 text-xs font-medium rounded-md transition-all duration-150 inline-flex items-center justify-center gap-1.5"
            :class="activeTab === 'apikey' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'"
            @click="activeTab = 'apikey'"
          >
            <AppIcon name="key" :size="14" class="-ml-0.5" />
            API Key
          </button>
        </div>

        <!-- Password form -->
        <form v-if="activeTab === 'password'" @submit.prevent="handlePasswordLogin" class="space-y-4">
          <div>
            <label class="form-label">Username</label>
            <input
              v-model="username"
              type="text"
              class="form-input"
              placeholder="Enter your username"
              autocomplete="username"
              :disabled="auth.loading"
            />
          </div>
          <div>
            <label class="form-label">Password</label>
            <input
              v-model="password"
              type="password"
              class="form-input"
              placeholder="Enter your password"
              autocomplete="current-password"
              :disabled="auth.loading"
            />
          </div>
          <button
            type="submit"
            class="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="auth.loading || !username || !password"
          >
            <span v-if="auth.loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ auth.loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <!-- API Key form -->
        <form v-else @submit.prevent="handleApiKeyLogin" class="space-y-4">
          <div>
            <label class="form-label">Bay2Game API Key</label>
            <input
              v-model="apiKey"
              type="password"
              class="form-input font-mono text-xs"
              placeholder="Paste your Bay2Game API key"
              :disabled="auth.loading"
            />
            <p class="form-help mt-2">
              Get your API key from
              <a href="https://t.me/Bay2GameBot" target="_blank" class="text-primary-600 dark:text-primary-400 hover:underline">@Bay2GameBot</a>
              on Telegram. This validates your key with Bay2Game and logs you in automatically.
            </p>
          </div>
          <button
            type="submit"
            class="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="auth.loading || !apiKey"
          >
            <span v-if="auth.loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ auth.loading ? 'Verifying...' : 'Login with API Key' }}
          </button>
        </form>
      </div>

      <p class="text-xs text-slate-400 dark:text-slate-600 text-center mt-6">
        This admin area is for store management only.
      </p>
    </div>
  </div>
</template>
