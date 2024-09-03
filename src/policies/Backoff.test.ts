import { describe, it, expect, vi } from 'vitest'
import { Backoff } from './Backoff.js'
import type { RetryState } from '../core.js'

describe('Backoff', () => {
  it('should use default values when no options are provided', () => {
    const backoff = Backoff()

    expect(backoff({ attempt: 1 } as RetryState)).toBe(150)
    expect(backoff({ attempt: 2 } as RetryState)).toBe(300)
    expect(backoff({ attempt: 3 } as RetryState)).toBe(600)
  })

  it('should respect custom delay and exp options', () => {
    const backoff = Backoff({ delay: 100, exp: 3 })

    expect(backoff({ attempt: 1 } as RetryState)).toBe(100)
    expect(backoff({ attempt: 2 } as RetryState)).toBe(300)
    expect(backoff({ attempt: 3 } as RetryState)).toBe(900)
  })

  it('should respect the max option', () => {
    const backoff = Backoff({ delay: 1000, exp: 2, max: 3000 })

    expect(backoff({ attempt: 1 } as RetryState)).toBe(1000)
    expect(backoff({ attempt: 2 } as RetryState)).toBe(2000)
    expect(backoff({ attempt: 3 } as RetryState)).toBe(3000)
    expect(backoff({ attempt: 3 } as RetryState)).toBe(3000)
  })

  it('should throw TypeError for invalid delay', () => {
    expect(() => Backoff({ delay: -1 })).toThrow(TypeError)
    expect(() => Backoff({ delay: 0 })).toThrow(TypeError)
  })

  it('should throw TypeError for invalid exp', () => {
    expect(() => Backoff({ exp: -1 })).toThrow(TypeError)
    expect(() => Backoff({ exp: 0 })).toThrow(TypeError)
  })

  it('should call the next function if provided', () => {
    const backoff = Backoff()
    const next = vi.fn()

    backoff({ attempt: 1 } as RetryState, next)
    expect(next).toHaveBeenCalledWith({ attempt: 1 } as RetryState)
  })
})
