/**
 * Rate Limiting Middleware
 *
 * KV-backed sliding window rate limiter for Cloudflare Workers.
 * Uses CACHE_KV to track request counts per IP per time window.
 *
 * KV is eventually consistent, so counts may be slightly off under
 * extreme concurrency — but good enough for abuse prevention.
 */

import type { Context, Next } from 'hono'

export interface RateLimitOptions {
  /** Max requests per window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
  /** Key prefix to separate different rate limit groups */
  keyPrefix: string
}

/**
 * Create a rate limiting middleware using KV for distributed state.
 *
 * Returns 429 Too Many Requests with standard rate limit headers
 * when the limit is exceeded. Gracefully skips if KV is unavailable.
 */
export function rateLimit(options: RateLimitOptions) {
  return async (c: Context, next: Next) => {
    const kv = (c.env as any).CACHE_KV
    if (!kv) return next()

    const ip =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'

    const window = Math.floor(Date.now() / (options.windowSeconds * 1000))
    const key = `rl:${options.keyPrefix}:${ip}:${window}`

    try {
      const current = await kv.get(key)
      const count = current ? parseInt(current, 10) : 0

      // Set rate limit headers on every response
      c.header('X-RateLimit-Limit', String(options.limit))
      c.header('X-RateLimit-Remaining', String(Math.max(0, options.limit - count - 1)))
      c.header('X-RateLimit-Reset', String((window + 1) * options.windowSeconds))

      if (count >= options.limit) {
        c.header('Retry-After', String(options.windowSeconds))
        return c.json(
          {
            success: false,
            error: 'Too many requests',
            retry_after: options.windowSeconds,
          },
          429
        )
      }

      // Increment counter (fire-and-forget for performance)
      c.executionCtx.waitUntil(
        kv.put(key, String(count + 1), {
          expirationTtl: options.windowSeconds + 60,
        })
      )
    } catch (error) {
      // KV failure should not block the request
      console.warn('[RateLimit] KV error, skipping:', error)
    }

    return next()
  }
}
