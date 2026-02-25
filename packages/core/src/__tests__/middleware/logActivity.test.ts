/**
 * logActivity + logActivityFromContext Unit Tests
 *
 * Verifies that activity logging writes to D1 and degrades gracefully on failure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// Import the real implementations
import { logActivity, logActivityFromContext } from '../../middleware/index'

describe('logActivity', () => {
  let mockRun: ReturnType<typeof vi.fn>
  let mockBind: ReturnType<typeof vi.fn>
  let mockPrepare: ReturnType<typeof vi.fn>
  let mockDB: any

  beforeEach(() => {
    mockRun = vi.fn().mockResolvedValue({ success: true })
    mockBind = vi.fn().mockReturnValue({ run: mockRun })
    mockPrepare = vi.fn().mockReturnValue({ bind: mockBind })
    mockDB = { prepare: mockPrepare }
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-1234' as any)
  })

  it('writes a row to activity_logs when DB is available', async () => {
    await logActivity(
      mockDB,
      'user-1',
      'content.create',
      'content',
      'content-123',
      { title: 'Test Post' },
      '1.2.3.4',
      'Mozilla/5.0'
    )

    expect(mockPrepare).toHaveBeenCalledOnce()
    expect(mockPrepare.mock.calls[0][0]).toContain('INSERT INTO activity_logs')
    expect(mockBind).toHaveBeenCalledWith(
      'test-uuid-1234',
      'user-1',
      'content.create',
      'content',
      'content-123',
      '{"title":"Test Post"}',
      '1.2.3.4',
      'Mozilla/5.0',
      expect.any(Number)
    )
    expect(mockRun).toHaveBeenCalledOnce()
  })

  it('handles null optional fields', async () => {
    await logActivity(mockDB, 'user-1', 'user.logout')

    expect(mockBind).toHaveBeenCalledWith(
      'test-uuid-1234',
      'user-1',
      'user.logout',
      null,
      null,
      null,
      null,
      null,
      expect.any(Number)
    )
  })

  it('swallows errors gracefully when DB throws', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockRun.mockRejectedValue(new Error('D1 unavailable'))

    await logActivity(mockDB, 'user-1', 'content.create')

    expect(consoleSpy).toHaveBeenCalledWith(
      '[logActivity] Failed to write activity log:',
      expect.any(Error)
    )
    consoleSpy.mockRestore()
  })

  it('returns silently when DB is null/undefined', async () => {
    // Should not throw
    await logActivity(null as any, 'user-1', 'content.create')
    await logActivity(undefined as any, 'user-1', 'content.create')
    expect(mockPrepare).not.toHaveBeenCalled()
  })
})

describe('logActivityFromContext', () => {
  it('extracts user, IP, and user-agent from Hono context', async () => {
    const mockRun = vi.fn().mockResolvedValue({ success: true })
    const mockBind = vi.fn().mockReturnValue({ run: mockRun })
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind })
    const mockDB = { prepare: mockPrepare }

    vi.spyOn(crypto, 'randomUUID').mockReturnValue('ctx-uuid-5678' as any)

    const app = new Hono()
    app.use('*', async (c, next) => {
      // @ts-ignore
      c.env = { DB: mockDB }
      c.set('user', { userId: 'user-ctx-1', email: 'test@example.com' })
      await next()
    })
    app.post('/test', async (c) => {
      await logActivityFromContext(c, 'content.update', 'content', 'c-456', {
        title: 'Updated',
      })
      return c.text('ok')
    })

    const res = await app.request('/test', {
      method: 'POST',
      headers: {
        'cf-connecting-ip': '10.0.0.1',
        'user-agent': 'TestAgent/1.0',
      },
    })

    expect(res.status).toBe(200)
    expect(mockBind).toHaveBeenCalledWith(
      'ctx-uuid-5678',
      'user-ctx-1',
      'content.update',
      'content',
      'c-456',
      '{"title":"Updated"}',
      '10.0.0.1',
      'TestAgent/1.0',
      expect.any(Number)
    )
  })

  it('falls back to x-forwarded-for when cf-connecting-ip is absent', async () => {
    const mockRun = vi.fn().mockResolvedValue({ success: true })
    const mockBind = vi.fn().mockReturnValue({ run: mockRun })
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind })
    const mockDB = { prepare: mockPrepare }

    const app = new Hono()
    app.use('*', async (c, next) => {
      // @ts-ignore
      c.env = { DB: mockDB }
      c.set('user', { userId: 'user-2' })
      await next()
    })
    app.post('/test', async (c) => {
      await logActivityFromContext(c, 'user.login')
      return c.text('ok')
    })

    await app.request('/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.1' },
    })

    // IP should be from x-forwarded-for
    expect(mockBind.mock.calls[0][6]).toBe('192.168.1.1')
  })

  it('uses "unknown" for userId when user context is not set', async () => {
    const mockRun = vi.fn().mockResolvedValue({ success: true })
    const mockBind = vi.fn().mockReturnValue({ run: mockRun })
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind })
    const mockDB = { prepare: mockPrepare }

    const app = new Hono()
    app.use('*', async (c, next) => {
      // @ts-ignore
      c.env = { DB: mockDB }
      // Deliberately NOT setting c.set('user', ...)
      await next()
    })
    app.post('/test', async (c) => {
      await logActivityFromContext(c, 'auth.login_failed')
      return c.text('ok')
    })

    await app.request('/test', { method: 'POST' })

    // userId should fall back to 'unknown'
    expect(mockBind.mock.calls[0][1]).toBe('unknown')
  })

  it('uses user.id as fallback when userId is not present', async () => {
    const mockRun = vi.fn().mockResolvedValue({ success: true })
    const mockBind = vi.fn().mockReturnValue({ run: mockRun })
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind })
    const mockDB = { prepare: mockPrepare }

    const app = new Hono()
    app.use('*', async (c, next) => {
      // @ts-ignore
      c.env = { DB: mockDB }
      c.set('user', { id: 'user-id-fallback', email: 'test@example.com' })
      await next()
    })
    app.post('/test', async (c) => {
      await logActivityFromContext(c, 'content.create')
      return c.text('ok')
    })

    await app.request('/test', { method: 'POST' })

    expect(mockBind.mock.calls[0][1]).toBe('user-id-fallback')
  })
})
