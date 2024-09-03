import type { RetryPolicy } from '../core.js'

export type BreakerOptions = {
  /**
   * The maximum number of retries before giving up. Defaults to 10.
   * @default 10
   */
  max?: number | undefined
}

/**
 * Stop retrying after a certain number of attempts.
 */
export const Breaker = (options?: BreakerOptions): RetryPolicy => {
  const max = options?.max ?? 10

  return (state, next) => {
    if (state.attempt >= max) {
      throw state.error
    }

    if (next) {
      return next(state)
    }

    throw state.error
  }
}
