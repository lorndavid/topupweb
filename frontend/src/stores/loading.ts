/**
 * loading.ts
 *
 * Global loading state tracker.
 *
 * This module uses module-level reactive refs so it can be imported by
 * both axios interceptors (api.ts) and Vue components (App.vue) without
 * circular dependency issues that would arise from using a Pinia store.
 *
 * Usage:
 *   import { isAnyLoading, incrementApiRequest, decrementApiRequest } from '@/stores/loading'
 *
 *   // Axios interceptor (api.ts):
 *   api.interceptors.request.use((config) => { incrementApiRequest(); return config })
 *   api.interceptors.response.use((res) => { decrementApiRequest(); return res })
 *
 *   // Route guard (App.vue):
 *   import { isAnyLoading, setRouteLoading } from '@/stores/loading'
 *   <RouteLoadingBar :loading="isAnyLoading" />
 */
import { ref, computed, readonly } from 'vue'

/* ─── Module-level reactive state ────────────────────────────
 * These refs persist across component instances because they are
 * defined at the module scope, not inside a composable function.
 */

/** Number of currently in-flight API requests */
const _apiRequestCount = ref(0)

/** Whether a route transition is in progress */
const _routeLoading = ref(false)

/* ─── Public computed ──────────────────────────────────────── */

/** True when ANY loading is happening (API request or route transition) */
export const isAnyLoading = computed(() => _apiRequestCount.value > 0 || _routeLoading.value)

/** Readonly count of in-flight API requests */
export const apiRequestCount = readonly(_apiRequestCount)

/** Readonly route loading flag */
export const routeLoading = readonly(_routeLoading)

/* ─── Actions ──────────────────────────────────────────────── */

/**
 * Call when an API request starts.
 * Used by axios request interceptor.
 */
export function incrementApiRequest(): void {
  _apiRequestCount.value++
}

/**
 * Call when an API request completes (success or error).
 * Used by axios response interceptor.
 */
export function decrementApiRequest(): void {
  _apiRequestCount.value = Math.max(0, _apiRequestCount.value - 1)
}

/**
 * Set the route loading state.
 * Used by router.beforeEach / router.afterEach in App.vue.
 */
export function setRouteLoading(val: boolean): void {
  _routeLoading.value = val
}

/**
 * Reset all loading states (useful for testing or error recovery).
 */
export function resetLoading(): void {
  _apiRequestCount.value = 0
  _routeLoading.value = false
}
