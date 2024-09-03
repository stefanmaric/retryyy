import { describe, expect, it, vi } from 'vitest'
import { Retryyy, retryyy, type RetryPolicy } from './retryyy.js'

const TEST_OPTIONS = {
  // Short delay and short timeout to make the test fast
  initialDelay: 15,
  timeout: 350,
  // Disable logging so tests don't fail
  logError: false,
  logWarn: false,
} as const

describe('retryyy', () => {
  it('should retry the operation a few times', async () => {
    const fn = vi.fn(() => Promise.reject(new Error('Failure')))

    await expect(retryyy(fn, TEST_OPTIONS)).rejects.toThrow('Failure')

    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(5)
  })

  it('should use the Default policy when none is provided', async () => {
    const DefaultModule = await import('./policies/Default.js')
    const defaultSpy = vi.spyOn(DefaultModule, 'Default')

    await retryyy(async () => {})

    expect(defaultSpy).toHaveBeenCalledTimes(1)
    expect(defaultSpy).toHaveBeenCalledWith(undefined)

    defaultSpy.mockRestore()
  })

  it('should pass through options to the Default policy', async () => {
    const DefaultModule = await import('./policies/Default.js')
    const defaultSpy = vi.spyOn(DefaultModule, 'Default')
    const fn = vi.fn(() => Promise.reject(new Error('Failure')))

    const options = {
      ...TEST_OPTIONS,
      maxAttempts: 1,
    }

    await expect(retryyy(fn, options)).rejects.toThrow('Failure')

    expect(defaultSpy).toHaveBeenCalledTimes(1)
    expect(defaultSpy).toHaveBeenCalledWith(options)

    defaultSpy.mockRestore()
  })

  it('should use custom policy if provided', async () => {
    const DefaultModule = await import('./policies/Default.js')
    const defaultSpy = vi.spyOn(DefaultModule, 'Default')
    const fn = vi.fn(() => Promise.reject(new Error('Failure')))
    const policy = vi.fn<RetryPolicy>((state) => {
      if (state.error) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw state.error
      }

      return 0
    })

    await expect(retryyy(fn, policy)).rejects.toThrow('Failure')

    expect(defaultSpy).toHaveBeenCalledTimes(0)
    expect(policy).toHaveBeenCalledTimes(1)

    defaultSpy.mockRestore()
  })

  it('should retry immediately if fastTrack is true', async () => {
    const fn = vi.fn(() => Promise.reject(new Error('Failure')))
    const options = {
      ...TEST_OPTIONS,
      maxAttempts: 2,
      fastTrack: true,
    }

    const start = Date.now()
    await expect(retryyy(fn, options)).rejects.toThrow('Failure')
    const end = Date.now()

    expect(fn.mock.calls.length).toBe(2)
    expect(end - start).toBeLessThanOrEqual(2)
  })

  it('should not retry if aborted before first attempt', async () => {
    const controller = new AbortController()
    const { signal } = controller
    // Abort right away
    controller.abort(new Error('Aborted'))

    const fn = vi.fn(() => Promise.reject(new Error('Failure')))

    await expect(retryyy(fn, TEST_OPTIONS, signal)).rejects.toThrow('Aborted')

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should stop retrying if aborted between attempts', async () => {
    const controller = new AbortController()
    const { signal } = controller
    // Abort after a short delay
    setTimeout(() => {
      controller.abort(new Error('Aborted'))
    }, 35)

    const fn = vi.fn(() => Promise.reject(new Error('Failure')))

    await expect(retryyy(fn, TEST_OPTIONS, signal)).rejects.toThrow('Aborted')

    expect(fn.mock.calls.length).toBeGreaterThan(1)
    expect(fn.mock.calls.length).toBeLessThanOrEqual(5)
  })
})

describe('Retryyy', () => {
  it('should wrap class methods in retry logic', async () => {
    // There's no easy way to spy on the intermediary class method before it
    // gets wrapped by the decorator, so track manually.
    let called = 0

    class UserModel {
      @Retryyy(TEST_OPTIONS)
      async fetchUser(id: number) {
        called++
        throw new Error('Failure')
        return Promise.resolve({ id, name: 'John Doe' })
      }
    }

    const model = new UserModel()

    await expect(model.fetchUser(1)).rejects.toThrow('Failure')
    expect(called).toBeGreaterThan(1)
  })
})
