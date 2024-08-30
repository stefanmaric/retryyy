import type { RetryPolicy, RetryState } from '../core.js'

export type JitterOptions = {
  /**
   * By how much to shift the target random window from the value provided by
   * the next policy on the chain. It is a proportion of the delay; that's it,
   * if the delay is 7 seconds and you set an `offset` of -0.5, the random
   * window with be shifted left by 3.5 seconds. Defaults to 0.25.
   * @default 0.25
   */
  offset?: number | undefined
  /**
   * How big the random window should be. It is a proportion of the delay;
   * that's it, if the delay is 7 seconds and you set a `range` of 0.5, an
   * amount between 0 and 3.5 seconds will be added to the delay, which could be
   * shifted left or right based on the `offset`. Defaults to -0.5.
   * @default -0.5
   */
  range?: number | undefined
}

/**
 * Randomizes the delay between retries by adding or removing a random amount of
 * time to the delay provided by the next policy in the chain.
 */
export const Jitter = (options: JitterOptions): RetryPolicy => {
  const range = options.range ?? -0.5
  const offset = options.offset ?? 0.25

  return (state, next) => {
    if (!next) {
      throw state.error
    }

    const delay = next(state)

    const jitter = delay * range * Math.random()
    const shift = delay * offset

    return delay + jitter + shift
  }
}

/**
 * Full jitter strategy, where the random window is the same size as the delay,
 * e.g., if the delay is 4 seconds, the final delay will be between 0 and 4.
 *
 * @see https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
export const FullJitter = (): RetryPolicy => Jitter({ offset: -1, range: 1 })

/**
 * Equal jitter strategy, where the random window is half the size of the delay,
 * e.g., if the delay is 4 seconds, the final delay will be between 2 and 6.
 *
 * @see https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
export const EqualJitter = (): RetryPolicy =>
  Jitter({ offset: -0.5, range: 0.5 })

export type DecorrelatedJitterOptions = {
  /**
   * The initial delay in milliseconds. Defaults to 150ms.
   */
  initial?: number
  /**
   * The maximum delay in milliseconds. Defaults to 30 seconds.
   */
  max?: number
}

/**
 * AWS decorrelated jitter strategy for exponential backoff.
 *
 * This method adds randomness to exponential backoff, reducing synchronized retries in distributed systems.
 * It varies the retry delay by picking a random value between the base delay and a calculated upper bound,
 * helping to prevent the "thundering herd" problem under high load.
 *
 * If you are considering this strategy, it would be best to use the PollyJitter strategy instead,
 * as it is better suited for high-throughput scenarios.
 *
 * @see https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
export const DecorrelatedJitter = (
  options?: DecorrelatedJitterOptions,
): RetryPolicy => {
  const initial = options?.initial ?? 150
  const max = options?.max ?? 30_000

  return (state, next) => {
    void next?.(state)

    const past = state.attempt === 1 ? initial : state.delay
    const top = Math.min(max, past * 3)

    return Math.random() * (top - initial) + initial
  }
}

export type PollyJitterOptions = {
  /**
   * The desired median first delay in milliseconds. Every delay will be
   * calculated based on this value. Defaults to 150ms.
   * @default 150
   */
  initial?: number | undefined
  /**
   * The maximum delay in milliseconds. Defaults to 30 seconds.
   * @default 30000
   */
  max?: number | undefined
}

const POLLY_P_FACTOR = 4
const POLLY_RP_SCALING_FACTOR = 1 / 1.4

/**
 * An exponential backoff jitter strategy borrowed from the Polly lib for C#.
 *
 * This strategy mitigates the problem of correlated retries in high-throughput
 * scenarios by adding randomness (jitter) to the wait time, preventing retries
 * from overwhelming the service simultaneously.
 *
 * This formula ensures a smooth and even distribution of retry intervals,
 * maintaining a well-controlled median initial delay while providing broadly
 * exponential backoff across retries.
 *
 * NOTE: be aware this policy, unlike the other jitter policies, ignores the
 * delay provided by the next policy in the chain.
 *
 * @see https://github.com/App-vNext/Polly/issues/530
 * @see https://github.com/Polly-Contrib/Polly.Contrib.WaitAndRetry/blob/63544b79349239295e3f11b7a2ded9bc5a5270d6/src/Polly.Contrib.WaitAndRetry/Backoff.DecorrelatedJitterV2.cs
 */
export const PollyJitter = (options?: PollyJitterOptions): RetryPolicy => {
  const factors = new WeakMap<RetryState, number>()
  const initial = options?.initial ?? 150
  const max = options?.max ?? 30_000

  return (state, middleware) => {
    void middleware?.(state)

    // NOTE: attempt is 1-based, so we subtract 1 to make it 0-based
    const t = state.attempt - 1 + Math.random()
    const prev = factors.get(state) ?? 0
    const next = Math.pow(2, t) * Math.tanh(Math.sqrt(POLLY_P_FACTOR * t))
    const shift = next - prev

    factors.set(state, next)

    return Math.min(max, shift * POLLY_RP_SCALING_FACTOR * initial)
  }
}
