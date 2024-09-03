# retryyy

A better way to retry async operations in TypeScript/JavaScript.

<p>
	<a href="https://github.com/stefanmaric/retryyy/blob/main/.github/CODE_OF_CONDUCT.md" target="_blank"><img alt="🤝 Code of Conduct: Kept" src="https://img.shields.io/badge/%F0%9F%A4%9D_code_of_conduct-kept-21bb42" /></a>
	<a href="https://codecov.io/gh/stefanmaric/retryyy" target="_blank"><img alt="🧪 Coverage" src="https://img.shields.io/codecov/c/github/stefanmaric/retryyy?label=%F0%9F%A7%AA%20coverage" /></a>
	<a href="https://github.com/stefanmaric/retryyy/blob/main/LICENSE.md" target="_blank"><img alt="📝 License: MIT" src="https://img.shields.io/badge/%F0%9F%93%9D_license-MIT-21bb42.svg"></a>
	<a href="http://npmjs.com/package/retryyy"><img alt="📦 npm version" src="https://img.shields.io/npm/v/retryyy?color=21bb42&label=%F0%9F%93%A6%20npm" /></a>
	<img alt="💪 TypeScript: Strict" src="https://img.shields.io/badge/%F0%9F%92%AA_typescript-strict-21bb42.svg" />
</p>

---

## Highlights

- 🪄 **Easy**: Handy defaults and easily configurable.
- 🪶 **Lightweight**: Only 619 bytes core (417B gzipped). Get all the goodies for 2.6kb (1.3kB gzipped).
- 📦 **Complete**: Includes circuit breaker, exponential backoff, timeout, jitter, logging, branded errors, and more.
- 🌟 **Modern**: Leverage modern standards like `AbortSignal`, `AggregateError`, [decorators](https://2ality.com/2022/10/javascript-decorators.html), and [ESM](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
- 🧘 **Simple**: More than a library, `retryyy` is a pattern for retry control-flow.
- 🔗 **Composable**: Policies are functions that can be chained together like middlewares.
- 🔐 **Type-safe**: Safely wrap your existing TypeScript functions in retry logic.

## Setup

Install it from npm with your preferred package manager:

```shell
pnpm add retryyy
```

```shell
npm install retryyy
```

```shell
yarn add retryyy
```

```shell
bun add retryyy
```

## Usage

```javascript
import { retryyy } from 'retryyy'

retryyy(async () => {
  const res = await fetch(`https://jsonplaceholder.typicode.com/users/${1}`)
  const user = await res.json()
  console.log(user)
})
```

It will retry the provided async functions using the [Default policy](./src/policies/Default.ts).

### Customizing the default policy

An object can be passed as a second argument to `retryyy()` to customize the behavior of the default policy.

```javascript
import { retryyy } from 'retryyy'

retryyy(
  async () => {
    // do stuff...
  },
  {
    timeout: 10_000, // Shorter timeout; 10 seconds.
  },
)
```

#### Options

| Option         | Description                                         | Default         |
| -------------- | --------------------------------------------------- | --------------- |
| `fastTrack`    | If true, runs the first re-attempt immediately.     | `false`         |
| `initialDelay` | The initial delay in milliseconds.                  | 150ms           |
| `logError`     | Logger function to use when giving up on retries.   | `console.error` |
| `logWarn`      | Logger function to use when retrying.               | `console.warn`  |
| `maxAttempts`  | The maximum number of attempts to make.             | 10              |
| `maxDelay`     | The maximum delay between attempts in milliseconds. | 30 seconds      |
| `timeout`      | The time in milliseconds after which to give up.    | 30 seconds      |
| `next`         | Chain another policy after the default ones.        | `undefined`     |

#### Retry indefinitely

```javascript
import { retryyy } from 'retryyy'

retryyy(
  async () => {
    // do stuff...
  },
  {
    maxAttempts: Infinity,
    timeout: Infinity,
  },
)
```

#### Disable logs

```javascript
import { retryyy } from 'retryyy'

retryyy(
  async () => {
    // do stuff...
  },
  {
    logError: false,
    logWarn: false,
  },
)
```

### Wrapping functions

While `retryyy()` is a handy option, the `wrap()` API allows for better composition and cleaner code by taking existing functions and creating new ones with retry logic attached to them. Its signature is similar but, instead of executing the passed function immediately, it returns a new function.

```typescript
import { wrap } from 'retryyy'

type UserShape = { id: number; name: string }

async function _fetchUser(id: number) {
  const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`)
  return (await res.json()) as UserShape
}

export const fetchUser = wrap(_fetchUser, { timeout: 10_000 })

const user = await fetchUser(1)
console.log(user)
```

### Wrapping class methods

Class methods can be decorated with `Retryyy` (uppercase initial):

```typescript
import { Retryyy } from 'retryyy'

type UserShape = { id: number; name: string }

class UserModel {
  @Retryyy({ timeout: 10_000 })
  async fetchUser(id: number) {
    const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`)
    return (await res.json()) as UserShape
  }
}

const users = new UserModel()
const user = await users.fetchUser(1)
console.log(user)
```

`@Retryyy` decorators use the [Stage 3 ECMAScript Decorators spec](https://github.com/tc39/proposal-decorators) so [TypeScript 5.0](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#decorators) or higher is required.

Alternatively, [class field syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields) can be used, but be aware of `this` binding behaviors and the potential performance penalty since the method will be attached to individual instances rather than to the shared prototype.

```typescript
import { wrap } from 'retryyy'

type UserShape = { id: number; name: string }

class UserModel {
  fetchUser = wrap(async (id: number) => {
    const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`)
    return (await res.json()) as UserShape
  })
}
```

`@Retryyy` is actually a factory that returns a decorator that can be referenced and applied multiple times:

```typescript
import { Retryyy } from 'retryyy'

const RetryForever = Retryyy({ maxAttempts: Infinity, timeout: Infinity })

class UserModel {
  @RetryForever
  async fetchUser(id: number) {
    // do stuff...
  }

  @RetryForever
  async deleteUser(id: number) {
    // do stuff...
  }
}

class CartModel {
  @RetryForever
  async clearCart() {
    // do stuff...
  }
}
```

### Custom policies

A policy in `retryyy` is a function that controls the retry behavior based on the current retry state, returning a delay in milliseconds to wait before the next attempt or throwing an error to give up on the operation.

```typescript
import type { RetryPolicy } from 'retryyy'
import { retryyy } from 'retryyy'

const customPolicy: RetryPolicy = (state) => {
  if (state.attempt > 3 || state.elapsed > 5_000) {
    throw state.error
  }

  return state.attempt * 1000
}

type UserShape = { id: number; name: string }

retryyy(async () => {
  const res = await fetch(`https://jsonplaceholder.typicode.com/users/${1}`)
  const user = await res.json()
  console.log(user)
}, customPolicy)
```

This example implements a simple linear backoff, stopping after 3 retries or 5 seconds total, whatever happens first.

### Composing policies

Policies in `retryyy` can be composed using the `join()` function, allowing to create complex retry strategies from simpler building blocks.

```typescript
import type { RetryPolicy } from 'retryyy'
import { join, retryyy } from 'retryyy'

/* 1 */
const breaker: RetryPolicy = (state, next) => {
  if (state.attempt > 5) {
    throw state.error
  }

  return next(state)
}

/* 3 */
const jitter: RetryPolicy = (state, next) => {
  const delay = next(state)
  return delay + Math.random() * 1000
}

/* 2 */
const backoff: RetryPolicy = (state) => {
  return Math.pow(2, state.attempt - 1) * 1000
}

const composedPolicy = join(breaker, jitter, backoff)

type UserShape = { id: number; name: string }

retryyy(async () => {
  const res = await fetch(`https://jsonplaceholder.typicode.com/users/${1}`)
  const user = await res.json()
  console.log(user)
}, composedPolicy)
```

Policies are executed left to right, each able to throw an error, return a delay, or call the next policy. This composition allows for flexible and powerful retry strategies tailored to specific needs.

In this example:

1. `breaker`: Bails out from the operation after 5 attempts.
2. `backoff`: Exponential backoff starting at 1 second.
3. `jitter`: Adds some random time to the `delay` returned by the `backoff` (`next`) policy to prevent synchronized retries.

Note that the [`Default` policy](./src/policies/Default.ts) does exactly that.

### Advanced

#### Give up after certain errors

```typescript
import { wrap } from 'retryyy'

type UserShape = { id: number; name: string }

// Typed custom errors might be provided already by the SDKs you are using,
// but for this example we are creating our own custom error.
class APIError extends Error {
  statusCode: number
  constructor({ statusCode }: { statusCode: number }) {
    this.message = 'API responded with an error'
    this.statusCode = statusCode
  }
}

const _fetchUser = async (id: number) => {
  const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`)

  if (!res.ok) {
    throw new APIError(res)
  }

  return (await res.json()) as UserShape
}

export const fetchUser = wrap(_fetchUser, {
  next: ({ error }) => {
    // Too Many Requests
    if (error instanceof APIError && error.statusCode === 429) {
      // The server is already rate-limiting us, so bail out as re-trying won't
      // make any difference.
      throw error
    }
  },
})
```

#### Cancel operations mid-flight

[`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) is supported across `retryyy`'s APIs.

```typescript
import { retryyy } from 'retryyy'

let controller: AbortController | null = null

const handleSubmit = (event: SubmitEvent) => {
  event.preventDefault()

  if (controller) {
    // Do not restart the request if it is already in progress.
    return
  }

  try {
    controller = new AbortController()

    retryyy(
      async () => {
        const res = await fetch(
          `https://jsonplaceholder.typicode.com/users/1`,
          { signal: controller?.signal }, // Pass the signal to the fetch call.
        )
        const user = await res.json()
        console.log(user)
      },
      {
        // Pass an empty object if you don't need to customize the default policy.
      },
      controller.signal, // Pass the signal to the retryyy call.
    )
  } finally {
    controller = null
  }
}

const handleCancel = (event: MouseEvent) => {
  if (controller) {
    controller.abort(new Error('Request cancelled by the user'))
  }
}

document.querySelector('form').addEventListener('submit', handleSubmit)
document.querySelector('.cancel-btn').addEventListener('click', handleCancel)
```

For functions augmented with `wrap()` or `@Retryyy()`, an `AbortSignal` can be passed as the only argument; a new function will be returned with the signature of the original async function:

```typescript
import { wrap } from 'retryyy'

// Move the fetching logic outside.
const fetchUser = wrap(async (id: number, signal?: AbortSignal) => {
  const res = await fetch(
    `https://jsonplaceholder.typicode.com/users/${id}`,
    { signal }, // Pass the signal to the fetch call.
  )
  const user = await res.json()
  // We are only fetching now; let the caller decide what to do with the data.
  return user as { id: number; name: string }
})

let controller: AbortController | null = null

const handleSubmit = (event: SubmitEvent) => {
  event.preventDefault()

  if (controller) {
    // Do not restart the request if it is already in progress.
    return
  }

  try {
    controller = new AbortController()

    const user = await fetchUser(controller.signal)(1, controller.signal)
    console.log(user)
  } finally {
    controller = null
  }
}

const handleCancel = (event: MouseEvent) => {
  if (controller) {
    controller.abort(new Error('Request cancelled by the user'))
  }
}

document.querySelector('form').addEventListener('submit', handleSubmit)
document.querySelector('.cancel-btn').addEventListener('click', handleCancel)
```

It is important to note that in either case the `AbortSignal` is passed twice: once for `retryyy` to know when to cancel a scheduled attempt and another for the underlying `fetch()` call to cancel the inflight HTTP request.

#### Bandwidth savings

At only 619 bytes (417B gzipped), the [`core()`](./src/core.ts) implementation is a good option for specific use-cases. Its API is the same as that of `wrap()`, but a policy has to be provided explicitly.

```typescript
import { core as wrap } from 'retryyy/core'
import type RetryPolicy from 'retryyy/core'

const simpleExamplePolicy: RetryPolicy = ({ attempt, error }) => {
  // Give up after 3 tries.
  if (attempt > 3) {
    throw error
  }

  // Linear backoff, waits 1s, 2s, 3s, 4s, etc.
  return attempt * 1000
}

export const fetchUser = wrap(async (id: number) => {
  // do stuff...
}, simpleExamplePolicy)
```

In this case all the retry logic has to be implemented from scratch. For high-throughput production systems it is highly advisable to use a smarter backoff + jitter strategy like the [`PollyJitter` policy](./src/policies/Jitter.ts).

## Motivation

In the past, I've used various retry libraries like [`node-retry`](https://github.com/tim-kos/node-retry), [`p-retry`](https://github.com/sindresorhus/p-retry), and [`async-retry`](https://github.com/vercel/async-retry), but I've always felt at odds with them.

The thing that bothers me the most about existing retry libraries is that they force you to write code in a certain way. Retries are primarily an infrastructure reliability concern and rarely part of your core business logic, so it's best to keep them apart.

Moreover, existing libraries often lack the flexibility to customize retry logic to, for example, applying a different jitter strategy.

Lately, I've been simply hand-rolling my own retry function when needed:

```javascript
const wait = (ms) =>
  new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })

export const retry = (fn, policy) => {
  return async (...args) => {
    const state = {
      attempt: 0,
      elapsed: 0,
      error: null,
      start: Date.now(),
    }

    while (true) {
      try {
        return await fn(...args)
      } catch (error) {
        state.attempt += 1
        state.elapsed = Date.now() - state.start
        state.error = error
        await wait(policy(state))
      }
    }
  }
}
```

Such small function is pretty much the entirety of `retryyy`'s [core implementation](./src/core.ts).

## Contributing

Please refer to [CONTRIBUTING.md](./.github/CONTRIBUTING.md).

## Acknowledgements

Thanks to the inspiration from projects like [`node-retry`](https://github.com/tim-kos/node-retry), [`p-retry`](https://github.com/sindresorhus/p-retry), [`async-retry`](https://github.com/vercel/async-retry), and [`cockatiel`](https://github.com/connor4312/cockatiel).

Special thanks to the [Polly community](https://www.pollydocs.org/) and [@george-polevoy](https://github.com/george-polevoy) for their [better exponential backoff with jitter](https://github.com/App-vNext/Polly/issues/530).

> 💙 This package was templated with [`create-typescript-app`](https://github.com/JoshuaKGoldberg/create-typescript-app).

## License

[MIT](./LICENSE.md) ❤️
