<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'
import { useThemeStore } from '@/stores/theme'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

const props = withDefaults(defineProps<{
  labels: string[]
  values: number[]
  prefix?: string
  label?: string
}>(), {
  prefix: '$',
  label: undefined,
})

const theme = useThemeStore()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      label: props.label || (props.prefix === '$' ? 'Revenue' : 'Orders'),
      data: props.values,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderColor: '#6366f1',
      backgroundColor: (ctx: { chart: { ctx: CanvasRenderingContext2D } }) => {
        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300)
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)')
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)')
        return gradient
      },
      borderWidth: 2,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: theme.isDark ? '#1e293b' : '#ffffff',
      titleColor: theme.isDark ? '#f1f5f9' : '#0f172a',
      bodyColor: theme.isDark ? '#94a3b8' : '#475569',
      borderColor: theme.isDark ? '#334155' : '#e2e8f0',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 12,
      displayColors: false,
      callbacks: {
        label: (ctx: { parsed: { y: number } }) => props.prefix + ctx.parsed.y.toFixed(2),
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: theme.isDark ? '#64748b' : '#94a3b8',
        maxTicksLimit: 8,
      },
    },
    y: {
      grid: {
        color: theme.isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.5)',
      },
      ticks: {
        color: theme.isDark ? '#64748b' : '#94a3b8',
        callback: (value: number) => props.prefix + value.toFixed(2),
      },
    },
  },
}))
</script>

<template>
  <div class="card p-5">
    <div v-if="!$slots.header" class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-slate-900 dark:text-white">{{ prefix === '$' ? 'Revenue Overview' : 'Order Trend' }}</h3>
      <span class="text-xs text-slate-400">{{ prefix === '$' ? 'Amount in USD' : 'Order count' }}</span>
    </div>
    <slot name="header" />
    <div class="h-[280px]">
      <Line v-if="labels.length > 0" :data="chartData" :options="chartOptions" />
      <div v-else class="flex items-center justify-center h-full text-sm text-slate-400">No data available</div>
    </div>
  </div>
</template>
