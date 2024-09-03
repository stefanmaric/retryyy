import { describe, it, expect, vi } from 'vitest'
import { BrandError, RetryyyError } from './BrandError.js'
import type { RetryState } from '../core.js'

describe('BrandError', () => {
  it('should throw RetryyyError when no next function is provided', () => {
    const policy = BrandError()
    const testError = new Error('Test error')
    const state = {
      error: testError,
      errors: [testError],
    } as RetryState

    expect(() => policy(state)).toThrow(RetryyyError)
  })

  it('should call next function if provided', () => {
    const policy = BrandError()
    const next = vi.fn()
    const state = { error: null } as RetryState

    policy(state, next)
    expect(next).toHaveBeenCalledWith(state)
  })

  it('should wrap errors in RetryyyError', () => {
    const policy = BrandError()
    const lastError = new Error('Last error')
    const prevError = new Error('Previous error')
    const state = {
      error: lastError,
      errors: [prevError, lastError],
    } as RetryState

    expect(() => policy(state)).toThrow(RetryyyError)
    try {
      policy(state)
    } catch (error) {
      expect(error).toBeInstanceOf(RetryyyError)
      expect(error).toBeInstanceOf(AggregateError)
      expect((error as RetryyyError).errors).toHaveLength(2)
      expect((error as RetryyyError).errors[0]).toEqual(prevError)
      expect((error as RetryyyError).errors[1]).toEqual(lastError)
      expect((error as RetryyyError).cause).toEqual(lastError)
    }
  })

  it('should throw RetryyyError with correct message', () => {
    const policy = BrandError()
    const testError = new Error('Test error')
    const state = { error: testError, errors: [testError] } as RetryState

    expect(() => policy(state)).toThrow('RetryyyError')
  })
})
