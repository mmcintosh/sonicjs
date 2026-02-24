import { describe, it, expect, beforeEach, vi } from 'vitest'

// We need fresh module imports per test because buildRouteList caches results
// at the module level. Use vi.resetModules() + dynamic imports.

// Mock hono/dev inspectRoutes
const mockInspectRoutes = vi.fn()
vi.mock('hono/dev', () => ({
  inspectRoutes: mockInspectRoutes
}))

// Helper: create a mock route entry as returned by inspectRoutes
function route(method: string, path: string, isMiddleware = false) {
  return { method, path, isMiddleware, name: '' }
}

// Helper: get fresh module imports (resets cached route list)
async function freshImport() {
  vi.resetModules()
  // Re-register mock after reset
  vi.doMock('hono/dev', () => ({
    inspectRoutes: mockInspectRoutes
  }))
  const mod = await import('../../services/route-metadata')
  return mod
}

describe('Route Metadata Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // App Instance Storage
  // =========================================================================

  describe('setAppInstance / getAppInstance', () => {
    it('should store and retrieve the app instance', async () => {
      const { setAppInstance, getAppInstance } = await freshImport()
      const fakeApp = { name: 'test-app' }
      setAppInstance(fakeApp)
      expect(getAppInstance()).toBe(fakeApp)
    })

    it('should return null when no app is set', async () => {
      const { setAppInstance, getAppInstance } = await freshImport()
      setAppInstance(null)
      expect(getAppInstance()).toBeNull()
    })
  })

  // =========================================================================
  // CATEGORY_INFO
  // =========================================================================

  describe('CATEGORY_INFO', () => {
    it('should have all 11 categories', async () => {
      const { CATEGORY_INFO } = await freshImport()
      const expected = [
        'Auth', 'Content', 'Media', 'Admin', 'System',
        'Search', 'API Keys', 'Workflow', 'Cache', 'Forms', 'Files'
      ]
      for (const cat of expected) {
        expect(CATEGORY_INFO).toHaveProperty(cat)
      }
      expect(Object.keys(CATEGORY_INFO)).toHaveLength(11)
    })

    it('should have title, description, and icon for every category', async () => {
      const { CATEGORY_INFO } = await freshImport()
      for (const [, info] of Object.entries(CATEGORY_INFO)) {
        expect(info.title).toBeTruthy()
        expect(info.description).toBeTruthy()
        expect(info.icon).toBeTruthy()
      }
    })
  })

  // =========================================================================
  // buildRouteList
  // =========================================================================

  describe('buildRouteList', () => {
    it('should return empty array when app is null', async () => {
      const { buildRouteList } = await freshImport()
      const result = buildRouteList(null)
      expect(result).toEqual([])
    })

    it('should skip middleware entries', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('GET', '/api/content', true), // middleware
        route('GET', '/api/content', false), // actual route
      ])

      const result = buildRouteList({})
      expect(result).toHaveLength(1)
      expect(result[0].method).toBe('GET')
    })

    it('should skip ALL method routes', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('ALL', '/api/content'),
        route('GET', '/api/content'),
      ])

      const result = buildRouteList({})
      expect(result).toHaveLength(1)
      expect(result[0].method).toBe('GET')
    })

    it('should deduplicate routes with the same method and path', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('GET', '/api/content'),
        route('GET', '/api/content'),
      ])

      const result = buildRouteList({})
      expect(result).toHaveLength(1)
    })

    it('should enrich documented routes with metadata', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('POST', '/auth/login'),
      ])

      const result = buildRouteList({})
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        method: 'POST',
        path: '/auth/login',
        description: expect.stringContaining('Authenticate'),
        authentication: false,
        category: 'Auth',
        documented: true,
      })
    })

    it('should infer category and auth for undocumented routes', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('GET', '/api/content/some-new-endpoint'),
      ])

      const result = buildRouteList({})
      expect(result).toHaveLength(1)
      expect(result[0].documented).toBe(false)
      expect(result[0].category).toBe('Content')
    })

    it('should exclude HTML pages from auth routes', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('GET', '/auth/login'),      // excluded HTML page
        route('GET', '/auth/register'),   // excluded HTML page
        route('POST', '/auth/login'),     // included API endpoint
      ])

      const result = buildRouteList({})
      expect(result).toHaveLength(1)
      expect(result[0].method).toBe('POST')
    })

    it('should filter out non-API routes', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('GET', '/admin/dashboard'),   // not in whitelist
        route('GET', '/admin/settings'),    // not in whitelist
        route('GET', '/api/content'),       // in whitelist
      ])

      const result = buildRouteList({})
      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('/api/content')
    })

    it('should include routes matching whitelist patterns', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('GET', '/api/content'),
        route('POST', '/auth/login'),
        route('GET', '/admin/api/collections'),
        route('GET', '/admin/cache/stats'),
        route('GET', '/workflow/status/123'),
        route('GET', '/health'),
        route('GET', '/files/image.png'),
        route('GET', '/forms/contact'),
      ])

      const result = buildRouteList({})
      expect(result.length).toBe(8)
    })

    it('should sort routes by category, then method, then path', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('DELETE', '/api/content/1'),
        route('GET', '/api/content'),
        route('POST', '/auth/login'),
        route('GET', '/health'),
      ])

      const result = buildRouteList({})

      // Auth comes before Content, Content before System
      const categories = result.map(r => r.category)
      expect(categories).toEqual(['Auth', 'Content', 'Content', 'System'])
    })

    it('should return cached list on subsequent calls', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const first = buildRouteList({})
      const second = buildRouteList({})
      expect(first).toBe(second) // same reference = cached
      expect(mockInspectRoutes).toHaveBeenCalledTimes(1)
    })
  })

  // =========================================================================
  // inferCategory (tested indirectly via undocumented routes in buildRouteList)
  // =========================================================================

  describe('inferCategory (via undocumented routes)', () => {
    const testCases: Array<[string, string]> = [
      ['/auth/some-new', 'Auth'],
      ['/api/search/new-endpoint', 'Search'],
      ['/api/media/new-endpoint', 'Media'],
      ['/api/system/new-endpoint', 'System'],
      ['/api/content/new-endpoint', 'Content'],
      ['/api/collections/new-endpoint', 'Content'],
      ['/api/forms/new-endpoint', 'Forms'],
      ['/admin/api-keys/new-endpoint', 'API Keys'],
      ['/admin/cache/new-endpoint', 'Cache'],
      ['/admin/plugins/ai-search/api/new', 'Search'],
      ['/admin/api/new-endpoint', 'Admin'],
      ['/admin/database-tools/new-endpoint', 'Admin'],
      ['/admin/seed-data/new-endpoint', 'Admin'],
      ['/admin/plugins/email/new-endpoint', 'Admin'],
      ['/workflow/new-endpoint', 'Workflow'],
      ['/forms/new-endpoint', 'Forms'],
      ['/files/new-endpoint', 'Files'],
    ]

    for (const [path, expectedCategory] of testCases) {
      it(`should infer "${expectedCategory}" for ${path}`, async () => {
        const { buildRouteList } = await freshImport()
        mockInspectRoutes.mockReturnValue([route('GET', path)])

        const result = buildRouteList({})
        expect(result.length).toBeGreaterThan(0)
        expect(result[0].category).toBe(expectedCategory)
      })
    }
  })

  // =========================================================================
  // inferAuth (tested indirectly via undocumented routes in buildRouteList)
  // =========================================================================

  describe('inferAuth (via undocumented routes)', () => {
    it('should infer auth=false for /health', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])
      const result = buildRouteList({})
      expect(result[0].authentication).toBe(false)
    })

    it('should infer auth=false for /files/* routes', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/files/test.png')])
      const result = buildRouteList({})
      expect(result[0].authentication).toBe(false)
    })

    it('should infer auth=true for /admin/* routes', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/admin/api/new-thing')])
      const result = buildRouteList({})
      expect(result[0].authentication).toBe(true)
    })

    it('should infer auth=true for /workflow/* routes', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/workflow/new-thing')])
      const result = buildRouteList({})
      expect(result[0].authentication).toBe(true)
    })

    it('should infer auth=false for /forms/* routes', async () => {
      const { buildRouteList } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/forms/contact')])
      const result = buildRouteList({})
      expect(result[0].authentication).toBe(false)
    })
  })

  // =========================================================================
  // buildOpenAPISpec
  // =========================================================================

  describe('buildOpenAPISpec', () => {
    it('should return a valid OpenAPI 3.0.0 spec structure', async () => {
      const { buildOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('GET', '/health'),
        route('GET', '/api/content'),
      ])

      const spec = buildOpenAPISpec({}, 'https://example.com') as any

      expect(spec.openapi).toBe('3.0.0')
      expect(spec.info.title).toBe('SonicJS AI API')
      expect(spec.info.version).toBeTruthy()
      expect(spec.info.description).toBeTruthy()
      expect(spec.servers).toHaveLength(1)
      expect(spec.servers[0].url).toBe('https://example.com')
      expect(spec.components.securitySchemes.bearerAuth).toBeDefined()
    })

    it('should convert :param to {param} in paths', async () => {
      const { buildOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('GET', '/api/content/:id'),
      ])

      const spec = buildOpenAPISpec({}, 'https://example.com') as any

      expect(spec.paths['/api/content/{id}']).toBeDefined()
      expect(spec.paths['/api/content/:id']).toBeUndefined()
    })

    it('should add security for authenticated endpoints', async () => {
      const { buildOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('POST', '/api/content'),
      ])

      const spec = buildOpenAPISpec({}, 'https://example.com') as any

      const postOp = spec.paths['/api/content']['post']
      expect(postOp.security).toEqual([{ bearerAuth: [] }])
    })

    it('should not add security for public endpoints', async () => {
      const { buildOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('GET', '/health'),
      ])

      const spec = buildOpenAPISpec({}, 'https://example.com') as any

      const getOp = spec.paths['/health']['get']
      expect(getOp.security).toBeUndefined()
    })

    it('should add path parameters', async () => {
      const { buildOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('GET', '/api/content/:id'),
      ])

      const spec = buildOpenAPISpec({}, 'https://example.com') as any

      const getOp = spec.paths['/api/content/{id}']['get']
      expect(getOp.parameters).toHaveLength(1)
      expect(getOp.parameters[0]).toMatchObject({
        name: 'id',
        in: 'path',
        required: true,
      })
    })

    it('should add requestBody for POST/PUT/PATCH methods', async () => {
      const { buildOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('POST', '/api/content'),
        route('PUT', '/api/content/:id'),
        route('PATCH', '/admin/api/collections/:id'),
      ])

      const spec = buildOpenAPISpec({}, 'https://example.com') as any

      expect(spec.paths['/api/content']['post'].requestBody).toBeDefined()
      expect(spec.paths['/api/content/{id}']['put'].requestBody).toBeDefined()
      expect(spec.paths['/admin/api/collections/{id}']['patch'].requestBody).toBeDefined()
    })

    it('should not add requestBody for GET/DELETE methods', async () => {
      const { buildOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('GET', '/api/content'),
        route('DELETE', '/api/content/:id'),
      ])

      const spec = buildOpenAPISpec({}, 'https://example.com') as any

      expect(spec.paths['/api/content']['get'].requestBody).toBeUndefined()
      expect(spec.paths['/api/content/{id}']['delete'].requestBody).toBeUndefined()
    })

    it('should generate tags from used categories', async () => {
      const { buildOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('GET', '/health'),
        route('POST', '/auth/login'),
        route('GET', '/api/content'),
      ])

      const spec = buildOpenAPISpec({}, 'https://example.com') as any

      const tagNames = spec.tags.map((t: any) => t.name)
      expect(tagNames).toContain('System')
      expect(tagNames).toContain('Auth')
      expect(tagNames).toContain('Content')
    })

    it('should use the provided serverUrl', async () => {
      const { buildOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const spec = buildOpenAPISpec({}, 'https://my-app.workers.dev') as any

      expect(spec.servers[0].url).toBe('https://my-app.workers.dev')
    })
  })
})
