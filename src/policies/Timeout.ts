import type { RetryPolicy } from '../core.js'

export type TimeoutOptions = {
  /**
   * The time in milliseconds after which to give up. Defaults to 30 seconds.
   * @default 30000
   */
  after?: number | undefined
}

/**
 * Give up retrying after a certain amount of time has passed.
 *
 * This policy is useful when one wants to ensure that the function will not run
 * indefinitely, even if the other policies in the chain allow for it.
 *
 * NOTE: Be aware this applies a soft timeout, meaning that the function will
 * still run to completion, even if it exceeds the time limit. The error will
 * only be thrown after the function has finished executing. In order to cancel
 * operations mid-flight, your source async function must support abort signals
 * and you have to provide it yourself.
 */
export const Timeout = (options?: TimeoutOptions): RetryPolicy => {
  const after = options?.after ?? 30_000

  return (state, next) => {
    if (state.elapsed > after - state.delay || !next) {
      throw state.error
    }
    return next(state)
  }
}
