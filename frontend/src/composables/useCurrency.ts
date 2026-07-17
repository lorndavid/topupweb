/**
 * useCurrency.ts
 *
 * Composable for managing user's preferred currency display (USD or KHR).
 * Preference is persisted in localStorage with a ref that all components
 * can import and reactively use.
 */
import { ref, computed, readonly, watch } from 'vue'

export type Currency = 'USD' | 'KHR'

/** Exchange rate: 1 USD ≈ 4 100 KHR (matching backend bakong.service.ts) */
export const USD_TO_KHR_RATE = 4100

/** Module-level reactive state shared across all importing components */
const _preferred = ref<Currency>(loadPreference())

function loadPreference(): Currency {
  const saved = localStorage.getItem('currency')
  if (saved === 'USD' || saved === 'KHR') return saved
  return 'USD'
}

function savePreference(c: Currency) {
  localStorage.setItem('currency', c)
}

watch(_preferred, savePreference)

/** The user's preferred currency */
export const preferredCurrency = readonly(_preferred)

/** Toggle between USD and KHR */
export function toggleCurrency() {
  _preferred.value = _preferred.value === 'USD' ? 'KHR' : 'USD'
}

/** Set a specific currency */
export function setCurrency(c: Currency) {
  _preferred.value = c
}

/**
 * Format a USD amount in the preferred currency.
 * Returns { value, formatted, symbol, code }
 *
 * @example
 *   formatPrice(0.78, 'USD') // { value: 0.78, formatted: '$0.78', symbol: '$', code: 'USD' }
 *   formatPrice(0.78, 'KHR') // { value: 3198, formatted: '៛3,198', symbol: '៛', code: 'KHR' }
 */
export function formatPrice(
  usdAmount: number,
  currency: Currency = _preferred.value
): { value: number; formatted: string; symbol: string; code: Currency } {
  if (currency === 'KHR') {
    const khr = Math.round(usdAmount * USD_TO_KHR_RATE)
    return {
      value: khr,
      formatted: '៛' + khr.toLocaleString('en-KH'),
      symbol: '៛',
      code: 'KHR',
    }
  }
  return {
    value: usdAmount,
    formatted: '$' + usdAmount.toFixed(2),
    symbol: '$',
    code: 'USD',
  }
}

/**
 * Reactive version — returns a computed that updates when currency changes.
 * Preferred for Vue components.
 *
 * @example
 *   const price = useFormattedPrice(0.78)
 *   // price.value = { formatted: '$0.78', ... } or { formatted: '៛3,198', ... }
 */
export function useFormattedPrice(usdAmount: number | (() => number)) {
  const getAmount = typeof usdAmount === 'function' ? usdAmount : () => usdAmount
  return computed(() => formatPrice(getAmount(), _preferred.value))
}
