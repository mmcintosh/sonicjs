import type { Context, Next } from 'hono'
import { getLogger } from '../services/logger'

// Noise paths that should not be logged
const SKIP_PATHS = ['/health', '/favicon.svg', '/favicon.ico', '/admin/api/metrics']

// Module-level flags for opt-in high-volume middleware
let requestLoggingEnabled = false
let securityResponseLoggingEnabled = false

export function setRequestLoggingEnabled(enabled: boolean): void {
  requestLoggingEnabled = enabled
}

export function setSecurityLoggingEnabled(enabled: boolean): void {
  securityResponseLoggingEnabled = enabled
}

/**
 * Global HTTP request logger.
 *
 * Always sets requestId and startTime on context (used by other middleware for
 * correlation). The actual D1 write is gated by `requestLoggingEnabled` which
 * defaults to false — enable via `setRequestLoggingEnabled(true)`.
 */
export function loggingMiddleware() {
  return async (c: Context, next: Next) => {
    // Always set requestId and startTime — other middleware depends on these
    c.set('requestId', crypto.randomUUID())
    c.set('startTime', Date.now())

    await next()

    // Skip D1 write if request logging is disabled
    if (!requestLoggingEnabled) return

    // Skip noise paths
    const url = c.req.url
    if (SKIP_PATHS.some((p) => url.includes(p))) return

    try {
      const logger = getLogger(c.env?.DB)
      const duration = Date.now() - (c.get('startTime') as number)
      const ip =
        c.req.header('cf-connecting-ip') ||
        c.req.header('x-forwarded-for') ||
        'unknown'
      const ua = c.req.header('user-agent') || ''
      const user = c.get('user') as any

      // Fire-and-forget via waitUntil when available
      const logFn = () =>
        logger.logRequest(c.req.method, url, c.res.status, duration, {
          ipAddress: ip,
          userAgent: ua,
          userId: user?.userId,
          requestId: c.get('requestId') as string,
        })

      try {
        c.executionCtx?.waitUntil(logFn())
      } catch {
        // No executionCtx (test env) — fire and forget
        logFn().catch(() => {})
      }
    } catch {
      // Logger failure is non-fatal
    }
  }
}

/**
 * Security response logger — logs 401/403 responses as security events.
 *
 * Always mounted in the middleware chain but conditionally writes. Gated by
 * `securityResponseLoggingEnabled` which defaults to false — enable via
 * `setSecurityLoggingEnabled(true)`. This is separate from the `security`
 * category in log_config (which stays enabled for CSRF/rate-limit events).
 */
export function securityLoggingMiddleware() {
  return async (c: Context, next: Next) => {
    await next()

    if (!securityResponseLoggingEnabled) return

    // Only log auth failures and forbidden responses
    const status = c.res.status
    if (status !== 401 && status !== 403) return

    // Skip noise paths
    const url = c.req.url
    if (SKIP_PATHS.some((p) => url.includes(p))) return

    try {
      const logger = getLogger(c.env?.DB)
      const ip =
        c.req.header('cf-connecting-ip') ||
        c.req.header('x-forwarded-for') ||
        'unknown'
      const ua = c.req.header('user-agent') || ''
      const event = status === 401 ? 'auth-failure-response' : 'forbidden-response'

      await logger.logSecurity(event, 'medium', {
        ipAddress: ip,
        userAgent: ua,
        url,
        method: c.req.method,
        statusCode: status,
        requestId: c.get('requestId') as string,
      })
    } catch {
      // Logger failure is non-fatal
    }
  }
}

/**
 * Performance logger — logs requests that exceed a duration threshold.
 */
export function performanceLoggingMiddleware(thresholdMs: number = 1000) {
  return async (c: Context, next: Next) => {
    const start = Date.now()

    await next()

    const duration = Date.now() - start
    if (duration < thresholdMs) return

    try {
      const logger = getLogger(c.env?.DB)
      const ip =
        c.req.header('cf-connecting-ip') ||
        c.req.header('x-forwarded-for') ||
        'unknown'

      await logger.warn('api', `Slow request: ${c.req.method} ${c.req.url} took ${duration}ms`, {
        method: c.req.method,
        url: c.req.url,
        duration,
        thresholdMs,
        statusCode: c.res.status,
      }, {
        ipAddress: ip,
        requestId: c.get('requestId') as string,
      })
    } catch {
      // Logger failure is non-fatal
    }
  }
}

/**
 * Detailed request/response header logger (debug level).
 */
export function detailedLoggingMiddleware() {
  return async (c: Context, next: Next) => {
    const start = Date.now()

    // Log request headers
    try {
      const logger = getLogger(c.env?.DB)
      const reqHeaders: Record<string, string> = {}
      if (c.req.raw?.headers) {
        c.req.raw.headers.forEach((value: string, key: string) => {
          // Redact sensitive headers
          if (key === 'authorization' || key === 'cookie') {
            reqHeaders[key] = '[REDACTED]'
          } else {
            reqHeaders[key] = value
          }
        })
      }

      await logger.debug('api', `Request: ${c.req.method} ${c.req.url}`, {
        requestHeaders: reqHeaders,
      })
    } catch {
      // Logger failure is non-fatal
    }

    await next()

    // Log response headers
    try {
      const logger = getLogger(c.env?.DB)
      const duration = Date.now() - start
      const resHeaders: Record<string, string> = {}
      if (c.res?.headers) {
        c.res.headers.forEach((value: string, key: string) => {
          resHeaders[key] = value
        })
      }

      await logger.debug('api', `Response: ${c.res.status} (${duration}ms)`, {
        responseHeaders: resHeaders,
        statusCode: c.res.status,
        duration,
      })
    } catch {
      // Logger failure is non-fatal
    }
  }
}
