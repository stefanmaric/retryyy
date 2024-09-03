import { describe, it, expect } from 'vitest'
import {
  DecorrelatedJitter,
  EqualJitter,
  FullJitter,
  Jitter,
} from './Jitter.js'
import type { RetryState } from '../core.js'

describe('Jitter', () => {
  it('should randomize the delay between retries', () => {
    const jitter = Jitter()
    const state = { attempt: 1 } as RetryState
    const next = () => 100

    const delay1 = jitter(state, next)
    const delay2 = jitter(state, next)

    expect(delay1).not.toBe(delay2)
  })
})

describe('FullJitter', () => {
  it('should randomize the delay between 0 and the delay', () => {
    const jitter = FullJitter()
    const state = { attempt: 1 } as RetryState
    const next = () => 100

    const delay = jitter(state, next)

    expect(delay).toBeGreaterThanOrEqual(0)
    expect(delay).toBeLessThanOrEqual(100)
  })
})

describe('EqualJitter', () => {
  it('should randomize the delay between -50% and 50% of the delay', () => {
    const jitter = EqualJitter()
    const state = { attempt: 1 } as RetryState
    const next = () => 100

    const delay = jitter(state, next)

    expect(delay).toBeGreaterThanOrEqual(50)
    expect(delay).toBeLessThanOrEqual(100)
  })
})

describe('DecorrelatedJitter', () => {
  it('should randomize the delay between -50% and 50% of the delay', () => {
    const jitter = DecorrelatedJitter({ initial: 50, max: 1500 })
    const state = { attempt: 1, delay: 0 } as RetryState

    const first = jitter(state)
    expect(first).toBeGreaterThanOrEqual(50)
    expect(first).toBeLessThanOrEqual(150)

    state.attempt = 2
    state.delay = 100

    const second = jitter(state)
    expect(second).toBeGreaterThanOrEqual(50)
    expect(second).toBeLessThanOrEqual(300)
  })
})
