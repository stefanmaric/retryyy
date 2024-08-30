import type { RetryPolicy } from '../core.js'

export type LoggerOptions = {
  /**
   * A custom warn function to use instead of `console.warn`.
   * @default console.warn
   */
  warn?: typeof console.warn | undefined
  /**
   * A custom error function to use instead of `console.error`.
   * @default console.error
   */
  error?: typeof console.error | undefined
}

/**
 * Log retry attempts and operation failures. This policy should be used early
 * in the policy chain and will abort all operations if used at the end of the
 * chain.
 */
export const Logger = (options?: LoggerOptions): RetryPolicy => {
  const warn = options?.warn ?? console.warn
  const error = options?.error ?? console.error

  return (state, next) => {
    warn(
      `[retryyy] Attempt ${String(state.attempt)} failed after ${String(state.elapsed)}ms`,
      state.error,
    )

    try {
      if (next) {
        return next(state)
      }
      throw state.error
    } catch (err) {
      error(
        `[retryyy] Giving up after ${String(state.attempt)} attempts and ${String(state.elapsed)}ms`,
        err,
      )
      throw err
    }
  }
}
