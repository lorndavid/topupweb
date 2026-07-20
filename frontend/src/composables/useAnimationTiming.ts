/**
 * Centralized animation timing constants.
 *
 * These values mirror the CSS custom properties defined in style.css
 * (`--anim-enter-duration`, `--anim-leave-duration`, etc.) so that
 * GSAP / JS animations stay in sync with CSS transitions.
 *
 * Change the values here and in style.css — both must be kept in sync.
 */
export const ANIM_TIMING = {
  /** Duration for panel/slide enter transitions (seconds) */
  enterDuration: 0.4,
  /** Duration for panel/slide leave transitions (seconds) */
  leaveDuration: 0.25,
  /** Easing for enter transitions (GSAP-compatible string) */
  enterEase: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Easing for leave transitions */
  leaveEase: 'ease-in',
  /** Duration for backdrop fade-in (seconds) */
  backdropDuration: 0.3,
} as const
