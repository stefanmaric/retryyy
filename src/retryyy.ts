import type { RetryPolicy, WrappedFunction } from './core.js'
import { core } from './core.js'
import type { DefaultOptions } from './policies/Default.js'
import { Default } from './policies/Default.js'

/**
 * Wrap an async function with a retry policy. The returned function has the
 * same signature as the input function, but will retry the operation according
 * to the provided policy if an error is thrown.
 *
 * The returned function is overloaded to accept an AbortSignal as its only
 * argument, in such case, a function is returned with the original signature.
 *
 * @example
 * import { wrap } from 'retryyy'
 *
 * type UserShape = { id: number; name: string }
 *
 * async function _fetchUser(id: number): Promise<UserShape> {
 * 	const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`)
 * 	return await res.json() as UserShape
 * }
 *
 * export const fetchUser = wrap(_fetchUser, { timeout: 10_000 })
 */
export const wrap = <Input extends unknown[], Output>(
  fn: (...args: Input) => Promise<Output>,
  policy?: RetryPolicy | DefaultOptions,
): WrappedFunction<Input, Output> =>
  core(fn, typeof policy === 'function' ? policy : Default(policy))

/**
 * Retries an async function based on a retry policy.
 *
 * @param fn Async function to run and retry, if needed.
 * @param policy Function that drives the retry logic.
 * @param signal Optional signal to abort the retry loop.
 */
export const retryyy = <Output>(
  fn: () => Promise<Output>,
  policy?: RetryPolicy | DefaultOptions,
  signal?: AbortSignal,
): Promise<Output> => {
  if (signal) {
    return wrap(fn, policy)(signal)()
  }

  return wrap(fn, policy)()
}

/**
 * Decorator for class methods that retries the method based on a retry policy.
 */
export const Retryyy = (policy?: RetryPolicy | DefaultOptions) =>
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  function Decorator<This, Input extends unknown[], Output>(
    target: (this: This, ...args: Input) => Promise<Output>,
  ): WrappedFunction<Input, Output> {
    let wrapped: WrappedFunction<Input, Output> | undefined

    return function Decorated(this: This, ...args) {
      // This intermediate function is needed to bind the context of the class
      // method to the wrapped function, otherwise the context might be lost if
      // the method isn't explicitly bound.
      wrapped = wrapped ?? wrap(target.bind(this), policy)
      return wrapped(...args)
    }
  }

export * from './core.js'
export * from './policies/index.js'
