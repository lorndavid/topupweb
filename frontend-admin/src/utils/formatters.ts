/**
 * Formatting utilities for the admin dashboard
 */

/**
 * Format a USD amount with $ prefix and 2 decimal places
 */
export function formatUSD(amount: number): string {
  return '$' + amount.toFixed(2)
}

/**
 * Format a number with commas
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

/**
 * Format a date string to a human-readable format
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a date string with time
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format a relative time string (e.g., "2 hours ago", "5 min ago")
 */
export function timeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(dateStr)
}

/**
 * Get the color class for an order status badge
 */
export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    completed: 'badge-success',
    processing: 'badge-info',
    paid: 'badge-info',
    awaiting_stock: 'badge-warning',
    pending: 'badge-neutral',
    awaiting_payment: 'badge-warning',
    failed: 'badge-danger',
    cancelled: 'badge-neutral',
  }
  return map[status] || 'badge-neutral'
}

/**
 * Get the status label for display
 */
export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: 'Completed',
    processing: 'Processing',
    paid: 'Paid',
    awaiting_stock: 'Awaiting Stock',
    pending: 'Pending',
    awaiting_payment: 'Awaiting Payment',
    failed: 'Failed',
    cancelled: 'Cancelled',
  }
  return map[status] || status
}

/**
 * Calculate profit percentage
 */
export function calcProfitPercent(cost: number, sell: number): number {
  if (cost <= 0) return 0
  return ((sell - cost) / cost) * 100
}

/**
 * Calculate profit amount
 */
export function calcProfitAmount(cost: number, sell: number): number {
  return sell - cost
}
