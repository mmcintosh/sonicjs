import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loggingMiddleware,
  detailedLoggingMiddleware,
  securityLoggingMiddleware,
  performanceLoggingMiddleware,
  setRequestLoggingEnabled,
  setSecurityLoggingEnabled,
} from '../../middleware/logging'
import type { Context, Next } from 'hono'

// Mock the logger module
const mockLogRequest = vi.fn()
const mockWarn = vi.fn()
const mockError = vi.fn()
const mockDebug = vi.fn()
const mockInfo = vi.fn()
const mockLogSecurity = vi.fn()

vi.mock('../../services/logger', () => ({
  getLogger: vi.fn(() => ({
    logRequest: mockLogRequest,
    warn: mockWarn,
    error: mockError,
    debug: mockDebug,
    info: mockInfo,
    logSecurity: mockLogSecurity,
  }))
}))

describe('loggingMiddleware', () => {
  let mockContext: any
  let mockNext: Next

  beforeEach(() => {
    vi.clearAllMocks()
    setRequestLoggingEnabled(false)

    mockNext = vi.fn()
    mockContext = {
      req: {
        method: 'GET',
        url: 'http://example.com/test',
        header: vi.fn((name: string) => {
          const headers: Record<string, string> = {
            'user-agent': 'test-agent',
            'cf-connecting-ip': '127.0.0.1',
          }
          return headers[name]
        }),
      },
      res: {
        status: 200,
      },
      env: {
        DB: {} as D1Database,
      },
      set: vi.fn(),
      get: vi.fn((key: string) => {
        if (key === 'user') return { userId: 'user-123' }
        if (key === 'startTime') return Date.now()
        return undefined
      }),
    }
  })

  afterEach(() => {
    setRequestLoggingEnabled(false)
  })

  it('should set requestId and startTime on context', async () => {
    const middleware = loggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockContext.set).toHaveBeenCalledWith('requestId', expect.any(String))
    expect(mockContext.set).toHaveBeenCalledWith('startTime', expect.any(Number))
  })

  it('should call next middleware', async () => {
    const middleware = loggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
  })

  it('should skip logging for metrics endpoints', async () => {
    setRequestLoggingEnabled(true)
    mockContext.req.url = 'http://example.com/admin/api/metrics'

    const middleware = loggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockLogRequest).not.toHaveBeenCalled()
  })

  it('should extract IP address from different headers', async () => {
    mockContext.req.header = vi.fn((name: string) => {
      if (name === 'x-forwarded-for') return '192.168.1.1'
      return undefined
    })

    const middleware = loggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
  })

  it('should handle requests without user context', async () => {
    mockContext.get = vi.fn(() => undefined)

    const middleware = loggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
  })

  it('should not call logger when request logging is disabled', async () => {
    const middleware = loggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockLogRequest).not.toHaveBeenCalled()
  })

  it('should handle thrown errors', async () => {
    const error = new Error('Test error')
    mockNext = vi.fn().mockRejectedValue(error)

    const middleware = loggingMiddleware()

    await expect(middleware(mockContext as Context, mockNext)).rejects.toThrow('Test error')
  })

  it('should use unknown IP when no IP headers present', async () => {
    mockContext.req.header = vi.fn(() => undefined)

    const middleware = loggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
  })
})

describe('detailedLoggingMiddleware', () => {
  let mockContext: any
  let mockNext: Next

  beforeEach(() => {
    vi.clearAllMocks()

    mockNext = vi.fn()
    mockContext = {
      req: {
        method: 'POST',
        url: 'http://example.com/api/data',
        header: vi.fn((name: string) => {
          const headers: Record<string, string> = {
            'user-agent': 'test-agent',
            'cf-connecting-ip': '127.0.0.1',
            'content-type': 'application/json',
            'content-length': '1234',
          }
          return headers[name]
        }),
        raw: {
          headers: new Headers({
            'user-agent': 'test-agent',
            'content-type': 'application/json',
          }),
        },
      },
      res: {
        status: 201,
        headers: new Headers({
          'content-type': 'application/json',
          'content-length': '567',
        }),
      },
      env: {
        DB: {} as D1Database,
      },
      set: vi.fn(),
      get: vi.fn((key: string) => {
        if (key === 'user') return { userId: 'user-123' }
        return undefined
      }),
    }
  })

  it('should log request start and completion', async () => {
    const middleware = detailedLoggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockDebug).toHaveBeenCalledTimes(2) // request + response
  })

  it('should include request headers in debug log', async () => {
    const middleware = detailedLoggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockDebug).toHaveBeenCalledWith(
      'api',
      expect.stringContaining('Request:'),
      expect.objectContaining({ requestHeaders: expect.any(Object) })
    )
  })

  it('should include response headers in completion log', async () => {
    const middleware = detailedLoggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockDebug).toHaveBeenCalledWith(
      'api',
      expect.stringContaining('Response:'),
      expect.objectContaining({ responseHeaders: expect.any(Object) })
    )
  })

  it('should handle errors and rethrow', async () => {
    const error = new Error('Test error')
    mockNext = vi.fn().mockRejectedValue(error)

    const middleware = detailedLoggingMiddleware()

    await expect(middleware(mockContext as Context, mockNext)).rejects.toThrow('Test error')
  })
})

describe('securityLoggingMiddleware', () => {
  let mockContext: any
  let mockNext: Next

  beforeEach(() => {
    vi.clearAllMocks()
    setSecurityLoggingEnabled(false)

    mockNext = vi.fn()
    mockContext = {
      req: {
        method: 'GET',
        url: 'http://example.com/admin/users',
        header: vi.fn((name: string) => {
          const headers: Record<string, string> = {
            'user-agent': 'test-agent',
            'cf-connecting-ip': '127.0.0.1',
          }
          return headers[name]
        }),
      },
      res: {
        status: 200,
      },
      env: {
        DB: {} as D1Database,
      },
      set: vi.fn(),
      get: vi.fn((key: string) => {
        if (key === 'user') return { userId: 'user-123' }
        if (key === 'requestId') return 'req-123'
        return undefined
      }),
    }
  })

  afterEach(() => {
    setSecurityLoggingEnabled(false)
  })

  it('should not log when security logging is disabled', async () => {
    mockContext.res.status = 401

    const middleware = securityLoggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockLogSecurity).not.toHaveBeenCalled()
  })

  it('should log 401 responses when enabled', async () => {
    setSecurityLoggingEnabled(true)
    mockContext.res.status = 401

    const middleware = securityLoggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockLogSecurity).toHaveBeenCalledWith(
      'auth-failure-response',
      'medium',
      expect.objectContaining({ statusCode: 401 })
    )
  })

  it('should log 403 responses when enabled', async () => {
    setSecurityLoggingEnabled(true)
    mockContext.res.status = 403

    const middleware = securityLoggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockLogSecurity).toHaveBeenCalledWith(
      'forbidden-response',
      'medium',
      expect.objectContaining({ statusCode: 403 })
    )
  })

  it('should not log 200 responses even when enabled', async () => {
    setSecurityLoggingEnabled(true)
    mockContext.res.status = 200

    const middleware = securityLoggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockLogSecurity).not.toHaveBeenCalled()
  })

  it('should skip logging for metrics endpoints', async () => {
    setSecurityLoggingEnabled(true)
    mockContext.req.url = 'http://example.com/admin/api/metrics'
    mockContext.res.status = 401

    const middleware = securityLoggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockLogSecurity).not.toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    const error = new Error('Test error')
    mockNext = vi.fn().mockRejectedValue(error)

    const middleware = securityLoggingMiddleware()

    await expect(middleware(mockContext as Context, mockNext)).rejects.toThrow('Test error')
  })

  it('should include request context in security log', async () => {
    setSecurityLoggingEnabled(true)
    mockContext.res.status = 401

    const middleware = securityLoggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockLogSecurity).toHaveBeenCalledWith(
      'auth-failure-response',
      'medium',
      expect.objectContaining({
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        method: 'GET',
        requestId: 'req-123',
      })
    )
  })

  it('should pass through for non-auth-failure statuses', async () => {
    setSecurityLoggingEnabled(true)
    mockContext.res.status = 404

    const middleware = securityLoggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockLogSecurity).not.toHaveBeenCalled()
  })
})

describe('performanceLoggingMiddleware', () => {
  let mockContext: any
  let mockNext: Next

  beforeEach(() => {
    vi.clearAllMocks()

    mockNext = vi.fn()
    mockContext = {
      req: {
        method: 'GET',
        url: 'http://example.com/api/slow',
        header: vi.fn((name: string) => {
          if (name === 'cf-connecting-ip') return '127.0.0.1'
          return undefined
        }),
      },
      res: {
        status: 200,
      },
      env: {
        DB: {} as D1Database,
      },
      get: vi.fn((key: string) => {
        if (key === 'user') return { userId: 'user-123' }
        if (key === 'requestId') return 'req-123'
        return undefined
      }),
    }
  })

  it('should not log fast requests', async () => {
    mockNext = vi.fn().mockResolvedValue(undefined)

    const middleware = performanceLoggingMiddleware(1000)
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should log slow requests', async () => {
    mockNext = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    const middleware = performanceLoggingMiddleware(50)
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockWarn).toHaveBeenCalledWith(
      'api',
      expect.stringContaining('Slow request'),
      expect.objectContaining({ thresholdMs: 50 }),
      expect.any(Object)
    )
  })

  it('should use custom threshold', async () => {
    mockNext = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 60))
    })

    const middleware = performanceLoggingMiddleware(100)
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
    // 60ms < 100ms threshold, so no warning
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should handle errors without logging performance', async () => {
    const error = new Error('Test error')
    mockNext = vi.fn().mockRejectedValue(error)

    const middleware = performanceLoggingMiddleware(1000)

    await expect(middleware(mockContext as Context, mockNext)).rejects.toThrow('Test error')
  })

  it('should use default threshold of 1000ms', async () => {
    mockNext = vi.fn().mockResolvedValue(undefined)

    const middleware = performanceLoggingMiddleware()
    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockWarn).not.toHaveBeenCalled()
  })
})
