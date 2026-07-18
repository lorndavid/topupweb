<script setup lang="ts">
import { ref, computed } from 'vue'
import html2canvas from 'html2canvas'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{
  reference: string
  gameName: string
  productName: string
  playerId: string
  serverId?: string | null
  amount: number
  paymentStatus: string
  orderStatus: string
  createdAt: string
  completedAt?: string | null
}>()

const toast = useToastStore()
const receiptRef = ref<HTMLElement | null>(null)
const downloading = ref(false)
const sharing = ref(false)

// ─── Check if native share + files are available ──────────
const canShare = computed(() => {
  try {
    return !!navigator.share && !!navigator.canShare &&
      navigator.canShare({ files: [new File([''], 't.png', { type: 'image/png' })] })
  } catch { return false }
})

// ─── Shared: capture receipt as canvas ─────────────────────
async function captureReceiptCanvas(): Promise<HTMLCanvasElement | null> {
  if (!receiptRef.value) return null
  try {
    return await html2canvas(receiptRef.value, {
      useCORS: true,
      scale: 2,
      backgroundColor: '#ffffff',
    })
  } catch { return null }
}

// ─── Share receipt via native share sheet ─────────────────
async function handleShareReceipt() {
  const canvas = await captureReceiptCanvas()
  if (!canvas) return

  sharing.value = true
  try {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    )
    if (!blob) return
    const file = new File(
      [blob],
      'receipt-' + props.reference.toLowerCase() + '.png',
      { type: 'image/png' }
    )
    await navigator.share({
      title: 'Payment Receipt - ' + props.reference,
      text: `Payment receipt for ${props.gameName} - $${props.amount.toFixed(2)}`,
      files: [file],
    })
    toast.success('Receipt shared successfully')
  } catch (err: any) {
    // User cancelled share — not an error
    if (err?.name !== 'AbortError') {
      toast.error('Failed to share: ' + (err?.message || 'unknown error'))
    }
  } finally {
    sharing.value = false
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    completed: 'Completed',
    paid: 'Paid',
    processing: 'Processing',
    awaiting_stock: 'Awaiting Stock',
    awaiting_payment: 'Awaiting Payment',
    failed: 'Failed',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: '#059669',
    paid: '#2563eb',
    processing: '#2563eb',
    awaiting_stock: '#7c3aed',
    failed: '#dc2626',
    cancelled: '#6b7280',
  }
  return colors[status] || '#6b7280'
}

async function handleDownloadReceipt() {
  if (!receiptRef.value) return

  downloading.value = true
  try {
    const canvas = await html2canvas(receiptRef.value, {
      useCORS: true,
      scale: 2,
      backgroundColor: '#ffffff',
    })

    const link = document.createElement('a')
    link.download = `receipt-${props.reference.toLowerCase()}.png`
    link.href = canvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Receipt downloaded successfully')
  } catch {
    toast.error('Failed to download receipt')
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div class="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[10px] text-primary-200 uppercase tracking-wider font-medium">Receipt</p>
          <p class="text-lg font-bold text-white mt-0.5 font-heading">Payment Invoice</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Receipt Content (captured by html2canvas) -->
    <div ref="receiptRef" class="bg-white">
      <!-- Dashed separator -->
      <div class="relative px-6">
        <div class="border-t-2 border-dashed border-surface-200"></div>
        <div class="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-surface-50"></div>
        <div class="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-surface-50"></div>
      </div>

      <div class="px-6 py-5 space-y-4">
        <!-- Status badge -->
        <div class="flex justify-center mb-2">
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            :style="{
              backgroundColor: statusColor(orderStatus) + '15',
              color: statusColor(orderStatus),
            }"
          >
            <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: statusColor(orderStatus) }"></span>
            {{ statusLabel(orderStatus) }}
          </span>
        </div>

        <!-- Reference -->
        <div class="text-center pb-3 border-b border-surface-100">
          <p class="text-[10px] text-surface-400 uppercase tracking-wider font-medium">Reference</p>
          <p class="text-sm font-mono font-bold text-surface-800 mt-0.5">{{ reference }}</p>
        </div>

        <!-- Game -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-surface-400">Game</span>
          <span class="text-sm font-semibold text-surface-800">{{ gameName }}</span>
        </div>
        <div class="h-px bg-surface-50"></div>

        <!-- Package -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-surface-400">Package</span>
          <span class="text-sm font-semibold text-surface-800">{{ productName }}</span>
        </div>
        <div class="h-px bg-surface-50"></div>

        <!-- Player ID -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-surface-400">Player ID</span>
          <span class="text-sm font-mono font-semibold text-surface-800">
            {{ playerId }}
            <span v-if="serverId" class="text-surface-400">({{ serverId }})</span>
          </span>
        </div>
        <div class="h-px bg-surface-50"></div>

        <!-- Amount -->
        <div class="flex items-center justify-between py-1">
          <span class="text-xs text-surface-400">Amount Paid</span>
          <span class="text-lg font-extrabold text-surface-900">${{ amount.toFixed(2) }}</span>
        </div>
        <div class="h-px bg-surface-50"></div>

        <!-- Date -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-surface-400">Date</span>
          <span class="text-xs font-medium text-surface-600">{{ formatDate(createdAt) }}</span>
        </div>
        <div v-if="completedAt" class="h-px bg-surface-50"></div>
        <div v-if="completedAt" class="flex items-center justify-between">
          <span class="text-xs text-surface-400">Completed</span>
          <span class="text-xs font-medium text-surface-600">{{ formatDate(completedAt) }}</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-3 bg-surface-50 border-t border-surface-100">
        <p class="text-center text-[10px] text-surface-400 font-medium">
          Powered by VidTopUp Store — KHQR Payment
        </p>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="px-6 py-4 border-t border-gray-100 dark:border-surface-700 space-y-3">
      <!-- Download Button -->
      <button
        @click="handleDownloadReceipt"
        :disabled="downloading"
        class="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-600 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg v-if="downloading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>{{ downloading ? 'Generating...' : 'Download Receipt' }}</span>
      </button>

      <!-- Share Button (native share API, mobile only) -->
      <button
        v-if="canShare"
        @click="handleShareReceipt"
        :disabled="sharing"
        class="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-surface-200 dark:border-surface-600 text-surface-500 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 hover:text-surface-700 dark:hover:text-surface-300 font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg v-if="sharing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span>{{ sharing ? 'Sharing...' : 'Share Receipt' }}</span>
      </button>
    </div>
  </div>
</template>
