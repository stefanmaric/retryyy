import type { RetryPolicy } from '../core.js'

export class RetryyyError extends AggregateError {
  constructor(errors: unknown[], options?: ErrorOptions) {
    super(errors, 'RetryyyError')
    this.cause = options?.cause
  }
}

/**
 * Collect and wrap errors occurred during an operation.
 */
export const BrandError = (): RetryPolicy => (state, next) => {
  try {
    if (next) {
      return next(state)
    }
    throw state.error
  } catch (err) {
    throw new RetryyyError(state.errors.concat(err), { cause: err })
  }
}
