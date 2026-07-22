<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import adminApi from '@/services/api'
import type { ProfitMargin, SaveProfitMarginPayload } from '@/types'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'

const toast = useToastStore()
const margins = ref<ProfitMargin[]>([])
const games = ref<{ game_code: string; game_name: string }[]>([])
const loading = ref(true)
const savingAll = ref(false)
const editMode = ref(false)

const editMargins = ref<Record<string, { type: 'percentage' | 'fixed'; value: number; min_profit?: number; max_profit?: number }>>({})

async function fetchData() {
  loading.value = true
  try {
    const [marginData, gameData] = await Promise.all([
      adminApi.getProfitMargins(),
      adminApi.getGames(),
    ])
    margins.value = marginData
    games.value = gameData.map((g) => ({ game_code: g.game_code, game_name: g.name }))

    // Initialize edit state
    marginData.forEach((m) => {
      editMargins.value[m.game_code] = {
        type: m.type,
        value: m.value,
        min_profit: m.min_profit,
        max_profit: m.max_profit,
      }
    })
  } catch (err) {
    toast.error('Failed to load profit settings', err instanceof Error ? err.message : '')
  } finally {
    loading.value = false
  }
}

function enableEdit() {
  editMode.value = true
}

function cancelEdit() {
  editMode.value = false
  // Reset to original values
  margins.value.forEach((m) => {
    editMargins.value[m.game_code] = {
      type: m.type,
      value: m.value,
      min_profit: m.min_profit,
      max_profit: m.max_profit,
    }
  })
}

async function saveAll() {
  savingAll.value = true
  try {
    const payloads: SaveProfitMarginPayload[] = Object.entries(editMargins.value).map(([game_code, data]) => ({
      game_code,
      type: data.type,
      value: data.value,
      min_profit: data.min_profit,
      max_profit: data.max_profit,
    }))
    const result = await adminApi.saveProfitMargins(payloads)
    if (result.success) {
      toast.success('Profit margins saved', 'All game margins have been updated')
      editMode.value = false
      await fetchData()
    } else {
      toast.error('Failed to save', result.message)
    }
  } catch (err) {
    toast.error('Error saving margins', err instanceof Error ? err.message : '')
  } finally {
    savingAll.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold font-heading text-slate-900 dark:text-white">Profit Settings</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure profit margins per game</p>
      </div>
      <div class="flex gap-2">
        <button
          v-if="!editMode"
          class="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          @click="enableEdit"
        >
          Edit Margins
        </button>
        <template v-if="editMode">
          <button
            class="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            @click="cancelEdit"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 text-sm font-medium rounded-lg bg-success-600 text-white hover:bg-success-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            :disabled="savingAll"
            @click="saveAll"
          >
            <span v-if="savingAll" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ savingAll ? 'Saving...' : 'Save All Changes' }}
          </button>
        </template>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <LoadingSkeleton v-for="i in 4" :key="i" type="card" />
    </div>

    <template v-else>
      <!-- Info card -->
      <div class="card p-4 mb-6 bg-gradient-to-r from-primary-50/50 to-info-50/50 dark:from-primary-500/5 dark:to-info-500/5 border-primary-200 dark:border-primary-700/30">
        <div class="flex items-start gap-3">
          <span class="text-lg flex-shrink-0">💡</span>
          <div>
            <p class="text-sm font-medium text-slate-900 dark:text-white">How profit margins work</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              <strong>Percentage:</strong> Adds X% to the Bay2Game cost price. E.g., 10% on a $1.00 product → sell for $1.10.<br />
              <strong>Fixed:</strong> Adds a fixed USD amount to the cost price. E.g., $0.20 on a $1.00 product → sell for $1.20.<br />
              <strong>Min/Max Profit:</strong> Optional caps on the profit amount.
            </p>
          </div>
        </div>
      </div>

      <!-- Margins table -->
      <div class="card overflow-hidden">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Margin Type</th>
                <th>Value</th>
                <th>Min Profit</th>
                <th>Max Profit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="game in games" :key="game.game_code">
                <td class="font-medium">{{ game.game_name }}</td>
                <td>
                  <div v-if="editMode" class="flex gap-2">
                    <select
                      v-model="editMargins[game.game_code].type"
                      class="form-input text-xs py-1.5 w-28"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <span v-else class="badge-info">
                    {{ margins.find((m) => m.game_code === game.game_code)?.type === 'percentage' ? 'Percentage' : 'Fixed' }}
                  </span>
                </td>
                <td>
                  <div v-if="editMode">
                    <div class="relative inline-block">
                      <span v-if="editMargins[game.game_code]?.type === 'fixed'" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <input
                        v-model.number="editMargins[game.game_code].value"
                        type="number"
                        step="0.01"
                        min="0"
                        class="form-input text-sm py-1.5 w-24 font-mono"
                        :class="editMargins[game.game_code]?.type === 'fixed' ? 'pl-5' : ''"
                      />
                      <span v-if="editMargins[game.game_code]?.type === 'percentage'" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                    </div>
                  </div>
                  <span v-else class="font-mono font-medium">
                    {{ margins.find((m) => m.game_code === game.game_code)?.type === 'percentage'
                      ? margins.find((m) => m.game_code === game.game_code)?.value + '%'
                      : '$' + margins.find((m) => m.game_code === game.game_code)?.value?.toFixed(2)
                    }}
                  </span>
                </td>
                <td>
                  <div v-if="editMode">
                    <div class="relative inline-block">
                      <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <input
                        v-model.number="editMargins[game.game_code].min_profit"
                        type="number"
                        step="0.01"
                        min="0"
                        class="form-input text-sm py-1.5 w-20 font-mono pl-5"
                        placeholder="—"
                      />
                    </div>
                  </div>
                  <span v-else class="text-sm text-slate-500">
                    {{ margins.find((m) => m.game_code === game.game_code)?.min_profit
                      ? '$' + margins.find((m) => m.game_code === game.game_code)?.min_profit?.toFixed(2)
                      : '—'
                    }}
                  </span>
                </td>
                <td>
                  <div v-if="editMode">
                    <div class="relative inline-block">
                      <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <input
                        v-model.number="editMargins[game.game_code].max_profit"
                        type="number"
                        step="0.01"
                        min="0"
                        class="form-input text-sm py-1.5 w-20 font-mono pl-5"
                        placeholder="—"
                      />
                    </div>
                  </div>
                  <span v-else class="text-sm text-slate-500">
                    {{ margins.find((m) => m.game_code === game.game_code)?.max_profit
                      ? '$' + margins.find((m) => m.game_code === game.game_code)?.max_profit?.toFixed(2)
                      : '—'
                    }}
                  </span>
                </td>
              </tr>
              <tr v-if="games.length === 0">
                <td colspan="5" class="text-center py-8 text-sm text-slate-400">No games configured</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
