import type { RetryPolicy } from '../core.js'

export type BackoffOptions = {
  /**
   * The base delay in milliseconds. This will be the delay for the first retry.
   * Subsequent retries will be exponentially longer. Defaults to 150ms.
   * @default 150
   */
  delay?: number | undefined
  /**
   * The exponent to use for the exponential backoff. Using 1 will result in a
   * linear backoff. Defaults to 2.
   * @default 2
   */
  exp?: number | undefined
  /**
   * The maximum delay in milliseconds. Once the delay reaches this value, it
   * will not increase any further. Defaults to 30 seconds.
   * @default 30000
   */
  max?: number | undefined
}

/**
 * Use at the end of a chain of policies to generate an exponentially increasing
 * delay between retries.
 */
export const Backoff = (options?: BackoffOptions): RetryPolicy => {
  const delay = options?.delay ?? 150
  const exp = options?.exp ?? 2
  const max = options?.max ?? 30_000

  if (delay <= 0) {
    throw new TypeError('delay must be a positive number')
  }

  if (exp <= 0) {
    throw new TypeError('exp must be a positive number')
  }

  return (state, next) => {
    void next?.(state)
    // NOTE: attempt starts at 1, so we subtract 1 to get the correct exponent.
    return Math.min(max, delay * Math.pow(exp, state.attempt - 1))
  }
}
