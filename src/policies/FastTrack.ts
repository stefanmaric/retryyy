import type { RetryPolicy } from '../core.js'

/**
 * Retries the operation immediately on the first re-attempt, delegating to the
 * next policy for subsequent attempts.
 */
export const FastTrack = (): RetryPolicy => {
  return (state, next) => {
    const delay = next?.(state) ?? 0
    return state.attempt === 1 ? 0 : delay
  }
}
