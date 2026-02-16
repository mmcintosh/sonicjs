import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { rateLimit } from './rate-limit'

describe('rateLimit middleware', () => {
  let mockKv: any
  let app: Hono

  beforeEach(() => {
    mockKv = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    }

    app = new Hono()

    // Apply rate limiter to test route
    app.use(
      '/test',
      rateLimit({ limit: 5, windowSeconds: 60, keyPrefix: 'test' })
    )
    app.get('/test', (c) => c.json({ ok: true }))
  })

  function makeRequest(ip: string = '1.2.3.4') {
    return app.request('/test', {
      headers: { 'cf-connecting-ip': ip },
    }, {
      CACHE_KV: mockKv,
    } as any, {
      waitUntil: vi.fn(),
    } as any)
  }

  it('should allow requests under the limit', async () => {
    mockKv.get.mockResolvedValue('3') // 3 of 5 used

    const res = await makeRequest()

    expect(res.status).toBe(200)
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5')
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('1') // 5 - 3 - 1
  })

  it('should return 429 when limit is reached', async () => {
    mockKv.get.mockResolvedValue('5') // 5 of 5 used

    const res = await makeRequest()

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Too many requests')
    expect(body.retry_after).toBe(60)
    expect(res.headers.get('Retry-After')).toBe('60')
  })

  it('should return 429 when over the limit', async () => {
    mockKv.get.mockResolvedValue('10') // 10 of 5 used

    const res = await makeRequest()

    expect(res.status).toBe(429)
  })

  it('should allow first request (no existing counter)', async () => {
    mockKv.get.mockResolvedValue(null)

    const res = await makeRequest()

    expect(res.status).toBe(200)
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('4') // 5 - 0 - 1
  })

  it('should increment counter via KV put', async () => {
    mockKv.get.mockResolvedValue('2')
    const waitUntil = vi.fn()

    const res = await app.request('/test', {
      headers: { 'cf-connecting-ip': '1.2.3.4' },
    }, {
      CACHE_KV: mockKv,
    } as any, {
      waitUntil,
    } as any)

    expect(res.status).toBe(200)
    expect(waitUntil).toHaveBeenCalledTimes(1)

    // Verify KV put was called with incremented count
    const putCall = waitUntil.mock.calls[0][0]
    // The promise was passed to waitUntil — we can check mockKv.put was called
    await putCall
    expect(mockKv.put).toHaveBeenCalledWith(
      expect.stringContaining('rl:test:1.2.3.4:'),
      '3',
      expect.objectContaining({ expirationTtl: expect.any(Number) })
    )
  })

  it('should use different keys for different IPs', async () => {
    mockKv.get.mockResolvedValue(null)
    const waitUntil = vi.fn()

    await app.request('/test', {
      headers: { 'cf-connecting-ip': '10.0.0.1' },
    }, {
      CACHE_KV: mockKv,
    } as any, {
      waitUntil,
    } as any)

    await app.request('/test', {
      headers: { 'cf-connecting-ip': '10.0.0.2' },
    }, {
      CACHE_KV: mockKv,
    } as any, {
      waitUntil,
    } as any)

    const key1 = mockKv.get.mock.calls[0][0]
    const key2 = mockKv.get.mock.calls[1][0]
    expect(key1).toContain('10.0.0.1')
    expect(key2).toContain('10.0.0.2')
    expect(key1).not.toBe(key2)
  })

  it('should fall back to x-forwarded-for when cf-connecting-ip is absent', async () => {
    mockKv.get.mockResolvedValue(null)
    const waitUntil = vi.fn()

    await app.request('/test', {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
    }, {
      CACHE_KV: mockKv,
    } as any, {
      waitUntil,
    } as any)

    const key = mockKv.get.mock.calls[0][0]
    expect(key).toContain('192.168.1.1') // First IP in chain
  })

  it('should skip rate limiting when KV is unavailable', async () => {
    const appNoKv = new Hono()
    appNoKv.use('/test', rateLimit({ limit: 5, windowSeconds: 60, keyPrefix: 'test' }))
    appNoKv.get('/test', (c) => c.json({ ok: true }))

    const res = await appNoKv.request('/test', {}, {} as any, {
      waitUntil: vi.fn(),
    } as any)

    expect(res.status).toBe(200)
  })

  it('should skip rate limiting when KV get fails', async () => {
    mockKv.get.mockRejectedValue(new Error('KV down'))

    const res = await makeRequest()

    expect(res.status).toBe(200)
  })

  it('should set X-RateLimit-Remaining to 0 when at limit minus 1', async () => {
    mockKv.get.mockResolvedValue('4') // 4 of 5 used, this is the last allowed

    const res = await makeRequest()

    expect(res.status).toBe(200)
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('should set KV TTL to windowSeconds + 60', async () => {
    mockKv.get.mockResolvedValue(null)
    const waitUntil = vi.fn()

    await app.request('/test', {
      headers: { 'cf-connecting-ip': '1.2.3.4' },
    }, {
      CACHE_KV: mockKv,
    } as any, {
      waitUntil,
    } as any)

    await waitUntil.mock.calls[0][0]
    expect(mockKv.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { expirationTtl: 120 } // 60 + 60
    )
  })
})
