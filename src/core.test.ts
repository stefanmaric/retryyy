import { assertType, describe, expect, it, vi } from 'vitest'

import type { RetryPolicy, RetryState } from './core.js'
import { core, join } from './core.js'

describe('core', () => {
  it('should call the input function several times', async () => {
    let calls = 0

    const wrapped = core(
      () => {
        calls += 1
        throw new Error('failure')
      },
      (state) => {
        if (state.attempt >= 3) {
          throw state.error
        }

        return 0
      },
    )

    await expect(wrapped()).rejects.toThrow('failure')
    expect(calls).toBe(3)
  })
})

describe('join', () => {
  it('should combine multiple retry policies', () => {
    const policy1 = vi.fn<RetryPolicy>((state, next) => {
      if (state.attempt > 2) {
        throw new Error('Max attempts reached')
      }
      return next ? next(state) : 0
    })
    const policy2 = vi.fn<RetryPolicy>((state) => state.attempt * 1000)
    const combinedPolicy = join(policy1, policy2)

    const state = {
      attempt: 1,
    } as RetryState

    expect(combinedPolicy(state)).toBe(1000)
    expect(policy1).toHaveBeenCalledWith(state, policy2)
    expect(policy2).toHaveBeenCalledWith(state)

    state.attempt = 2
    expect(combinedPolicy(state)).toBe(2000)

    state.attempt = 3
    expect(() => combinedPolicy(state)).toThrow('Max attempts reached')
  })

  it('should flatten nested arrays of policies', () => {
    const policy1: RetryPolicy = () => 100
    const policy2: RetryPolicy = () => 200
    const policy3: RetryPolicy = () => 300

    let combinedPolicy = join([policy1, policy2], policy3)
    expect(combinedPolicy({} as RetryState)).toBe(100)

    combinedPolicy = join(policy1, [policy2, policy3])
    expect(combinedPolicy({} as RetryState)).toBe(100)

    combinedPolicy = join(policy1, [policy2], policy3)
    expect(combinedPolicy({} as RetryState)).toBe(100)
  })

  it('should force at least 2 policies at the type-level', () => {
    expect(() => {
      // @ts-expect-error 2345 must pass at least 2 policies
      join()
      // @ts-expect-error 2345 must pass at least 2 policies
      join(vi.fn())
      // @ts-expect-error 2345 must pass at least 2 policies
      join([vi.fn()])
    }).toThrow()

    // While all these should be fine.
    assertType<RetryPolicy>(join(vi.fn(), vi.fn()))
    assertType<RetryPolicy>(join(vi.fn(), [vi.fn()]))
    assertType<RetryPolicy>(join(vi.fn(), [vi.fn(), vi.fn()]))
    assertType<RetryPolicy>(join([vi.fn()], [vi.fn(), vi.fn()]))
  })

  it('should provide inference to inline policies', () => {
    const policy = join(
      (state, next) => {
        assertType<RetryState>(state)
        assertType<RetryPolicy | undefined>(next)

        return next ? next(state) : 0
      },
      (state) => {
        assertType<RetryState>(state)

        return state.attempt * 1000
      },
    )

    expect(policy({ attempt: 1 } as RetryState)).toBe(1000)

    assertType<RetryPolicy>(policy)
  })
})
