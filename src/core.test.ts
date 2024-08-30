import { expect, test } from 'vitest'

import { core } from './core.js'

test('spy function called two times', async () => {
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
