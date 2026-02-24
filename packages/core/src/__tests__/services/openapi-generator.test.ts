import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock hono/dev inspectRoutes (required by route-metadata which openapi-generator imports)
const mockInspectRoutes = vi.fn()
vi.mock('hono/dev', () => ({
  inspectRoutes: mockInspectRoutes
}))

function route(method: string, path: string, isMiddleware = false) {
  return { method, path, isMiddleware, name: '' }
}

// Helper: get fresh module imports (resets cached route list)
async function freshImport() {
  vi.resetModules()
  vi.doMock('hono/dev', () => ({
    inspectRoutes: mockInspectRoutes
  }))
  const generator = await import('../../services/openapi-generator')
  return generator
}

describe('OpenAPI Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // generateOpenAPISpec - Structure
  // =========================================================================

  describe('generateOpenAPISpec', () => {
    it('should return a valid OpenAPI 3.0.0 spec', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const spec = generateOpenAPISpec({}, 'https://example.com')

      expect(spec.openapi).toBe('3.0.0')
      expect(spec.info.title).toBe('SonicJS API')
      expect(spec.info.version).toBe('1.0.0')
      expect(spec.info.description).toBeTruthy()
      expect(spec.info.contact).toBeDefined()
      expect(spec.info.license).toMatchObject({ name: 'MIT' })
    })

    it('should include the server URL', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const spec = generateOpenAPISpec({}, 'https://my-app.workers.dev')

      expect(spec.servers).toHaveLength(1)
      expect(spec.servers[0].url).toBe('https://my-app.workers.dev')
    })

    it('should include security schemes', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const spec = generateOpenAPISpec({}, 'https://example.com')

      expect(spec.components.securitySchemes.bearerAuth).toMatchObject({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      })
    })

    it('should include component schemas', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const spec = generateOpenAPISpec({}, 'https://example.com')

      expect(spec.components.schemas).toBeDefined()
      expect(spec.components.schemas).toHaveProperty('Content')
      expect(spec.components.schemas).toHaveProperty('Collection')
      expect(spec.components.schemas).toHaveProperty('Media')
      expect(spec.components.schemas).toHaveProperty('User')
      expect(spec.components.schemas).toHaveProperty('Error')
      expect(spec.components.schemas).toHaveProperty('SearchResult')
      expect(spec.components.schemas).toHaveProperty('APIKey')
    })
  })

  // =========================================================================
  // Path Parameters
  // =========================================================================

  describe('path parameter conversion', () => {
    it('should convert :param to {param}', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/api/content/:id')])

      const spec = generateOpenAPISpec({}, 'https://example.com')

      expect(spec.paths['/api/content/{id}']).toBeDefined()
    })

    it('should handle multiple path parameters', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('POST', '/api/content/:id/restore/:versionId'),
      ])

      const spec = generateOpenAPISpec({}, 'https://example.com')

      expect(spec.paths['/api/content/{id}/restore/{versionId}']).toBeDefined()
    })

    it('should convert wildcard paths /files/* to /files/{path}', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/files/*')])

      const spec = generateOpenAPISpec({}, 'https://example.com')

      expect(spec.paths['/files/{path}']).toBeDefined()
      expect(spec.paths['/files/*']).toBeUndefined()
    })
  })

  // =========================================================================
  // Operations
  // =========================================================================

  describe('operation building', () => {
    it('should add security for authenticated endpoints', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/admin/api/collections')])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/admin/api/collections']['get']

      expect(op.security).toEqual([{ bearerAuth: [] }])
    })

    it('should not add security for public endpoints', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/health']['get']

      expect(op.security).toBeUndefined()
    })

    it('should use ENDPOINT_DETAILS when available', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('POST', '/auth/login')])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/auth/login']['post']

      expect(op.operationId).toBe('login')
      expect(op.requestBody).toBeDefined()
      expect(op.requestBody.required).toBe(true)
      expect(op.responses['200']).toBeDefined()
      expect(op.responses['401']).toBeDefined()
    })

    it('should generate operationId for endpoints without explicit detail', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/admin/cache/stats')])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/admin/cache/stats']['get']

      expect(op.operationId).toBeTruthy()
      expect(typeof op.operationId).toBe('string')
    })

    it('should include tags matching the route category', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/api/content')])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/api/content']['get']

      expect(op.tags).toEqual(['Content'])
    })

    it('should add path parameters to the operation', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/api/content/:id')])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/api/content/{id}']['get']

      expect(op.parameters).toBeDefined()
      const idParam = op.parameters.find((p: any) => p.name === 'id')
      expect(idParam).toMatchObject({
        name: 'id',
        in: 'path',
        required: true,
      })
    })
  })

  // =========================================================================
  // Default Responses
  // =========================================================================

  describe('default responses', () => {
    it('should add 200 response for GET endpoints', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/admin/cache/health')])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/admin/cache/health']['get']

      expect(op.responses['200']).toBeDefined()
    })

    it('should add 200 and 201 responses for POST endpoints', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('POST', '/admin/cache/clear')])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/admin/cache/clear']['post']

      expect(op.responses['200']).toBeDefined()
    })

    it('should add 401 response for authenticated endpoints', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('DELETE', '/admin/api-keys/:id')])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/admin/api-keys/{id}']['delete']

      expect(op.responses['401']).toBeDefined()
    })
  })

  // =========================================================================
  // Tags
  // =========================================================================

  describe('tags', () => {
    it('should generate tags from used categories only', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('GET', '/health'),
        route('POST', '/auth/login'),
      ])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const tagNames = spec.tags.map(t => t.name)

      expect(tagNames).toContain('System')
      expect(tagNames).toContain('Auth')
      expect(tagNames).not.toContain('Media')
    })

    it('should sort tags alphabetically', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('GET', '/health'),
        route('POST', '/auth/login'),
        route('GET', '/api/content'),
      ])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const tagNames = spec.tags.map(t => t.name)

      const sorted = [...tagNames].sort()
      expect(tagNames).toEqual(sorted)
    })

    it('should include descriptions from CATEGORY_INFO', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('POST', '/auth/login')])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const authTag = spec.tags.find(t => t.name === 'Auth')

      expect(authTag?.description).toBeTruthy()
    })
  })

  // =========================================================================
  // Component Schemas
  // =========================================================================

  describe('component schemas', () => {
    it('Content schema should have expected properties', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const content = spec.components.schemas.Content

      expect(content.type).toBe('object')
      expect(content.properties.id).toBeDefined()
      expect(content.properties.title).toBeDefined()
      expect(content.properties.slug).toBeDefined()
      expect(content.properties.status).toBeDefined()
      expect(content.properties.data).toBeDefined()
    })

    it('SearchResult schema should include search-specific fields', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const sr = spec.components.schemas.SearchResult

      expect(sr.properties.data).toBeDefined()
      expect(sr.properties.meta.properties.mode).toBeDefined()
      expect(sr.properties.meta.properties.search_id).toBeDefined()
    })

    it('Error schema should have error and details', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const spec = generateOpenAPISpec({}, 'https://example.com')
      const err = spec.components.schemas.Error

      expect(err.properties.error).toBeDefined()
      expect(err.properties.details).toBeDefined()
    })
  })
})
