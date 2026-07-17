/**
 * loading.ts
 *
 * Tracks in-flight API requests so components (e.g. skeleton loaders)
 * can show loading states while data is being fetched.
 *
 * This module uses module-level reactive refs so it can be imported by
 * both axios interceptors (api.ts) and Vue components without circular
 * dependency issues.
 *
 * Usage (api.ts):
 *   import { incrementApiRequest, decrementApiRequest } from '@/stores/loading'
 *   api.interceptors.request.use((c) => { incrementApiRequest(); return c })
 *   api.interceptors.response.use((r) => { decrementApiRequest(); return r })
 */
import { ref, computed, readonly } from 'vue'

/** Number of currently in-flight API requests */
const _apiRequestCount = ref(0)

/** True when at least one API request is in progress */
export const isLoading = computed(() => _apiRequestCount.value > 0)

/** Readonly count of in-flight API requests */
export const apiRequestCount = readonly(_apiRequestCount)

/** Call when an API request starts (axios request interceptor) */
export function incrementApiRequest(): void {
  _apiRequestCount.value++
}

/** Call when an API request completes (axios response interceptor) */
export function decrementApiRequest(): void {
  _apiRequestCount.value = Math.max(0, _apiRequestCount.value - 1)
}

/** Reset all loading states (error recovery or testing) */
export function resetLoading(): void {
  _apiRequestCount.value = 0
}
