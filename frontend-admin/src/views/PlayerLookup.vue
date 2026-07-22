<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import adminApi from '@/services/api'
import AppIcon from '@/components/ui/AppIcon.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'

const toast = useToastStore()

interface LookupResult {
  username: string | null
  region: string | null
  gameTitle: string | null
  status: string
  timestamp?: string
  developer?: string
}

const game = ref('mlbb')
const userid = ref('')
const serverid = ref('')
const loading = ref(false)
const result = ref<LookupResult | null>(null)
const showResult = ref(false)

const popularGames = [
  { code: 'mlbb', name: 'Mobile Legends', needsServer: true },
  { code: 'freefire_sgmy', name: 'Free Fire SG/MY', needsServer: false },
  { code: 'pubgm', name: 'PUBG Mobile', needsServer: false },
  { code: 'bloodstrike', name: 'Blood Strike', needsServer: false },
]

async function handleLookup() {
  if (!userid.value) return
  loading.value = true
  showResult.value = false
  result.value = null

  try {
    const res = await adminApi.checkPlayerId({
      game: game.value,
      userid: userid.value,
      serverid: serverid.value || undefined,
    })
    if (res.success) {
      result.value = res.data as any
    } else {
      result.value = {
        username: null,
        region: null,
        gameTitle: null,
        status: res.data?.status || 'NOT_ALLOW',
      }
      toast.warning('Player not found', res.message)
    }
  } catch (err) {
    toast.error('Lookup failed', err instanceof Error ? err.message : '')
  } finally {
    loading.value = false
    showResult.value = true
  }
}

function clearResult() {
  result.value = null
  showResult.value = false
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold font-heading text-slate-900 dark:text-white">Player ID Lookup</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Look up any game player ID directly via Bay2Game</p>
      </div>
    </div>

    <div class="max-w-lg">
      <!-- Lookup form -->
      <div class="card p-6 mb-6">
        <h2 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">Check Player ID</h2>
        <div class="space-y-4">
          <!-- Game selector -->
          <div>
            <label class="form-label">Game</label>
            <select v-model="game" class="form-input">
              <option v-for="g in popularGames" :key="g.code" :value="g.code">{{ g.name }}</option>
            </select>
          </div>

          <!-- Player ID -->
          <div>
            <label class="form-label">Player ID</label>
            <input
              v-model="userid"
              type="text"
              class="form-input font-mono"
              placeholder="Enter player ID (e.g., 262856740)"
            />
          </div>

          <!-- Server ID (conditional) -->
          <div v-if="popularGames.find(g => g.code === game)?.needsServer">
            <label class="form-label">Server / Zone ID</label>
            <input
              v-model="serverid"
              type="text"
              class="form-input font-mono"
              placeholder="Enter server/zone ID (optional)"
            />
            <p class="form-help">Required for Mobile Legends and some other games</p>
          </div>

          <div class="flex gap-2">
            <button
              class="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              :disabled="loading || !userid"
              @click="handleLookup"
            >
              <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <AppIcon v-if="!loading" name="search" :size="14" />
              {{ loading ? 'Looking up...' : 'Look Up' }}
            </button>
            <button
              v-if="showResult"
              class="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              @click="clearResult"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <!-- Result -->
      <Transition name="slide-up">
        <div v-if="showResult" class="card p-6">
          <div v-if="loading" class="py-4">
            <LoadingSkeleton type="text" :lines="3" />
          </div>

          <template v-if="result">
            <!-- Success -->
            <div v-if="result.username" class="text-center">
              <div class="w-16 h-16 rounded-full bg-success-50 dark:bg-success-500/10 flex items-center justify-center mx-auto mb-4">
                <AppIcon name="check" :size="28" class="text-success-500" />
              </div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">{{ result.username }}</h3>
              <div class="space-y-2 mt-4 text-sm">
                <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/50">
                  <span class="text-slate-400">Status</span>
                  <span class="badge-success">{{ result.status }}</span>
                </div>
                <div v-if="result.region" class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/50">
                  <span class="text-slate-400">Region</span>
                  <span class="font-medium">{{ result.region }}</span>
                </div>
                <div v-if="result.gameTitle" class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/50">
                  <span class="text-slate-400">Game</span>
                  <span>{{ result.gameTitle }}</span>
                </div>
                <div v-if="result.developer" class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/50">
                  <span class="text-slate-400">Source</span>
                  <span class="text-xs">{{ result.developer }}</span>
                </div>
              </div>
            </div>

            <!-- Not Found -->
            <div v-else class="text-center">
              <div class="w-16 h-16 rounded-full bg-warning-50 dark:bg-warning-500/10 flex items-center justify-center mx-auto mb-4">
                <AppIcon name="x" :size="28" class="text-warning-500" />
              </div>
              <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Player Not Found</h3>
              <p class="text-xs text-slate-400 mt-1">Could not find a player with the provided ID. Check the ID and try again.</p>
            </div>
          </template>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.slide-up-enter-active { transition: all 0.3s ease-out; }
.slide-up-leave-active { transition: all 0.2s ease-in; }
.slide-up-enter-from { opacity: 0; transform: translateY(12px); }
.slide-up-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
