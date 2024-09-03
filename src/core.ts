/**
 * Async function that waits for a specified number of milliseconds to resolve.
 *
 * @param ms Number of milliseconds to wait.
 * @param signal Optional signal to abort the wait.
 * @returns A promise that resolves after the specified number of milliseconds.
 * @throws Only if the signal is aborted before the timeout.
 */
const wait = async (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason as Error)
      return
    }

    const timer = setTimeout(resolve, ms)

    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason as Error)
    })
  })

/**
 * A state object that is passed to each retry policy function. A new RetryState
 * is initialized on each async operation call. An operation is considered to be
 * the entire sequence of attempts, including the first one.
 */
export type RetryState = {
  /**
   * The number of attempts that have been made. Starts at 1, after invoking the
   * function for the first time.
   */
  attempt: number
  /**
   * The delay applied to the last attempt. Starts at 0, before invoking the
   * function for the first time.
   */
  delay: number
  /**
   * The time elapsed since the first attempt.
   */
  elapsed: number
  /**
   * The error that was thrown on the last attempt.
   */
  error: unknown
  /**
   * An array of all errors that have been thrown so far.
   */
  errors: unknown[]
  /**
   * The time when the first attempt was made.
   */
  start: number
}

/**
 * A function to be called after each failed attempt to determine the delay
 * before the next attempt. The function should return a number of milliseconds
 * to wait before the next attempt, or throw an error to give up. You can also
 * use this function to implement custom retry logic, run side effects
 * (e.g. logging), add special handling for specific errors, wrap errors in
 * custom types, etc.
 *
 * The function will receive the current state of the retry operation, and the
 * next policy in the chain (if any). If provided, the policy can invoke the
 * next policy in the chain or not, if called, it can respect the delay value it
 * returned or return its own. In either case, when a policy function throws an
 * error, the async operation will be aborted and the error will be propagated
 * to the caller.
 */
export type RetryPolicy = (
  state: Readonly<RetryState>,
  next?: RetryPolicy,
) => number

export type PolicyList =
  | [RetryPolicy, RetryPolicy, ...(RetryPolicy | RetryPolicy[])[]]
  | [[RetryPolicy], RetryPolicy, ...(RetryPolicy | RetryPolicy[])[]]
  | [
      [RetryPolicy],
      [RetryPolicy, ...RetryPolicy[]],
      ...(RetryPolicy | RetryPolicy[])[],
    ]
  | [
      RetryPolicy,
      [RetryPolicy, ...RetryPolicy[]],
      ...(RetryPolicy | RetryPolicy[])[],
    ]
  | [
      [RetryPolicy, RetryPolicy, ...RetryPolicy[]],
      ...(RetryPolicy | RetryPolicy[])[],
    ]

/**
 * Joins multiple retry policies into a single policy. The policies will be
 * called from left to right, each with the next policy as the second argument.
 *
 * @param policies The policies to join.
 * @returns A new policy that is the result of joining the provided policies.
 */
export const join = (...policies: PolicyList): RetryPolicy =>
  policies.flat().reduceRight((next, policy) => (state) => policy(state, next))

export type AbortWrapper<
  Args extends unknown[],
  Input extends unknown[],
  Output,
> = Args extends [AbortSignal]
  ? (...args: Input) => Promise<Output>
  : Promise<Output>

export type WrappedFunction<Input extends unknown[], Output> = <
  Args extends [AbortSignal] | Input,
>(
  ...args: Args
) => AbortWrapper<Args, Input, Output>

// TypeScript is not smart enough to narrow down the type of args when doing
// this check inline, so it has to be done in a separate guard function.
const isAbortArgs = (args: unknown[]): args is [AbortSignal] =>
  args.length === 1 && args[0] instanceof AbortSignal

/**
 * Wrap an async function with a retry policy. The returned function has the
 * same signature as the input function, but will retry the operation according
 * to the provided policy if an error is thrown.
 *
 * The returned function is overloaded to accept an AbortSignal as its only
 * argument, in such case, a function is returned with the original signature.
 *
 * @example
 * import { core as wrap } from 'retryyy/core'
 * import type RetryPolicy from 'retryyy/core'
 *
 * const simpleExamplePolicy: RetryPolicy = ({ attempt, error }) => {
 * 	// Give up after 3 tries.
 * 	if (attempt > 3) {
 * 		throw error
 * 	}
 *
 * 	// Linear backoff, waits 1s, 2s, 3s, 4s, etc.
 * 	return attempt * 1000
 * }
 *
 * type UserShape = { id: number; name: string }
 *
 * export const fetchUser = wrap(async (id: number) => {
 * 	const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`)
 * 	return await res.json() as UserShape
 * }, simpleExamplePolicy)
 */
export const core =
  <Input extends unknown[], Output>(
    fn: (...input: Input) => Promise<Output>,
    policy: RetryPolicy,
  ): WrappedFunction<Input, Output> =>
  <Args extends Input | [AbortSignal]>(...args: Args) => {
    let signal: AbortSignal | undefined

    if (isAbortArgs(args)) {
      signal = args[0]
      return exec as AbortWrapper<Args, Input, Output>
    }

    async function exec(...input: Input): Promise<Output> {
      const state: RetryState = {
        attempt: 0,
        delay: 0,
        elapsed: 0,
        error: null,
        errors: [],
        start: Date.now(),
      }

      for (;;) {
        try {
          return await fn(...input)
        } catch (error: unknown) {
          state.attempt += 1
          state.elapsed = Date.now() - state.start
          state.error = error
          state.errors.push(error)

          // This sets the "previous delay" for the next time the policy is
          // evaluated. It is important to set the other state fields before
          // invoking the policy.
          state.delay = policy(state)

          await wait(state.delay, signal)
        }
      }
    }

    return exec(...(args as Input)) as AbortWrapper<Args, Input, Output>
  }
