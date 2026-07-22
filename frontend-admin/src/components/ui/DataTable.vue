<script setup lang="ts" generic="T extends Record<string, unknown>">
import { ref, computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'

interface Column {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: unknown, row: T) => string | number
}

const props = withDefaults(defineProps<{
  columns: Column[]
  rows: T[]
  loading?: boolean
  selectable?: boolean
  emptyText?: string
  pageSize?: number
}>(), {
  loading: false,
  selectable: false,
  emptyText: 'No data available',
  pageSize: 10,
})

const emit = defineEmits<{
  sort: [key: string, direction: 'asc' | 'desc']
  select: [rows: T[]]
  rowClick: [row: T]
}>()

const selectedRows = ref<Set<number>>(new Set())
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)

const totalPages = computed(() => Math.ceil(props.rows.length / props.pageSize))

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize
  return props.rows.slice(start, start + props.pageSize)
})

function handleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
  emit('sort', key, sortDir.value)
}

function toggleSelect(index: number) {
  const globalIndex = (currentPage.value - 1) * props.pageSize + index
  if (selectedRows.value.has(globalIndex)) {
    selectedRows.value.delete(globalIndex)
  } else {
    selectedRows.value.add(globalIndex)
  }
  emit('select', [...selectedRows.value].map((i) => props.rows[i]))
}

function isSelected(index: number): boolean {
  const globalIndex = (currentPage.value - 1) * props.pageSize + index
  return selectedRows.value.has(globalIndex)
}

function handleRowClick(row: T) {
  emit('rowClick', row)
}
</script>

<template>
  <div class="card overflow-hidden">
    <!-- Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th v-if="selectable" class="w-10">
              <input
                type="checkbox"
                class="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
              />
            </th>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                col.sortable ? 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none' : '',
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
              ]"
              :style="col.width ? `width: ${col.width}` : ''"
              @click="col.sortable && handleSort(col.key)"
            >
              <div class="flex items-center gap-1">
                {{ col.label }}
                <span v-if="col.sortable && sortKey === col.key" class="text-primary-500 text-[10px]">
                  {{ sortDir === 'asc' ? '↑' : '↓' }}
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading state -->
          <tr v-if="loading">
            <td :colspan="columns.length + (selectable ? 1 : 0)" class="text-center py-12">
              <div class="flex flex-col items-center gap-3">
                <div class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <span class="text-sm text-slate-400">Loading data...</span>
              </div>
            </td>
          </tr>

          <!-- Empty state -->
          <tr v-else-if="paginatedRows.length === 0">
            <td :colspan="columns.length + (selectable ? 1 : 0)" class="text-center py-12">
              <div class="flex flex-col items-center gap-2">
                <AppIcon name="inbox" :size="28" class="text-slate-300 dark:text-slate-600" />
                <span class="text-sm text-slate-400">{{ emptyText }}</span>
              </div>
            </td>
          </tr>

          <!-- Data rows -->
          <tr
            v-for="(row, i) in paginatedRows"
            :key="i"
            class="cursor-pointer group"
            :class="isSelected(i) ? 'bg-primary-50/50 dark:bg-primary-500/5' : ''"
            @click="handleRowClick(row)"
          >
            <td v-if="selectable" @click.stop>
              <input
                type="checkbox"
                :checked="isSelected(i)"
                class="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                @change="toggleSelect(i)"
              />
            </td>
            <td
              v-for="col in columns"
              :key="col.key"
              :class="col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ col.render ? col.render(row[col.key], row) : row[col.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700/50">
      <span class="text-xs text-slate-400">
        Showing {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, rows.length) }} of {{ rows.length }}
      </span>
      <div class="flex items-center gap-1">
        <button
          class="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          :disabled="currentPage <= 1"
          @click="currentPage--"
        >
          Prev
        </button>
        <span
          v-for="p in totalPages"
          :key="p"
          class="px-2.5 py-1.5 text-xs rounded-md cursor-pointer transition-colors"
          :class="p === currentPage ? 'bg-primary-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'"
          @click="currentPage = p"
        >
          {{ p }}
        </span>
        <button
          class="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
