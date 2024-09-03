import type { RetryPolicy } from '../core.js'
import { join } from '../core.js'

import { Breaker } from './Breaker.js'
import { FastTrack } from './FastTrack.js'
import { PollyJitter } from './Jitter.js'
import { Logger } from './Logger.js'
import { Timeout } from './Timeout.js'

export type DefaultOptions = {
  /**
   * If true, runs the first re-attempt immediately, skipping the initial delay.
   * @default false
   */
  fastTrack?: boolean | undefined
  /**
   * The initial delay in milliseconds. Defaults to 150ms.
   * @default 150
   */
  initialDelay?: number | undefined
  /**
   * Logger function to use when giving up on retries. Passing `false` disables this type of
   * logging. Defaults to `console.error`.
   * @default console.error
   */
  logError?: typeof console.error | boolean | undefined
  /**
   * Logger function to use when retrying. Passing `false` disables this type of logging. Defaults
   * to `console.warn`.
   * @default console.warn
   */
  logWarn?: typeof console.warn | boolean | undefined
  /**
   * The maximum number of attempts to make. Defaults to 10.
   * @default 10
   */
  maxAttempts?: number | undefined
  /**
   * The maximum delay between attempts in milliseconds. Defaults to 30 seconds.
   * @default 30000
   */
  maxDelay?: number | undefined
  /**
   * The time in milliseconds after which to give up. Defaults to 30 seconds.
   * @default 30000
   */
  timeout?: number | undefined
  /**
   * Convenience property to chain another policy after the default ones. This
   * is useful when you want to add custom logic on top of the default policies.
   * This is equivalent to `policy = join(Default(), next)`.
   */
  next?: RetryPolicy
}

const noop = () => {}

const loggerOrNoop = (logger: typeof noop | boolean | undefined) => {
  if (typeof logger === 'function') {
    return logger
  }

  if (logger === true || logger === undefined) {
    return undefined
  }

  return noop
}

/**
 * The default retry policy used by `retryyy`. It includes:
 *
 * - Logger: logs retry attempts and failed operations to the console.
 * - Timeout: give up after a certain amount of time has passed.
 * - Breaker: stop retrying after a certain number of attempts.
 * - FastTrack: run the first re-attempt immediately if `fastTrack` is `true`.
 * - PollyJitter: advanced exponential backoff strategy with jitter.
 */
export const Default = (options?: DefaultOptions): RetryPolicy =>
  join(
    [
      Logger({
        error: loggerOrNoop(options?.logError),
        warn: loggerOrNoop(options?.logWarn),
      }),
      Timeout({
        after: options?.timeout,
      }),
      Breaker({
        max: options?.maxAttempts,
      }),
      options?.fastTrack ? FastTrack() : undefined,
      PollyJitter({
        initial: options?.initialDelay,
        max: options?.maxDelay,
      }),
      options?.next,
    ].filter(Boolean) as [RetryPolicy, RetryPolicy],
  )
