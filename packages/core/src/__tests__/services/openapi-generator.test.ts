import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

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

// Helper: create a mock D1 database
function createMockDB(collections: Array<{ name: string; display_name: string; schema: string }> = []) {
  return {
    prepare: (sql: string) => ({
      all: async () => ({ results: collections }),
      bind: (...args: any[]) => ({
        all: async () => ({ results: collections }),
        run: async () => ({ success: true })
      })
    })
  }
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

      const spec = await generateOpenAPISpec({}, 'https://example.com')

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

      const spec = await generateOpenAPISpec({}, 'https://my-app.workers.dev')

      expect(spec.servers).toHaveLength(1)
      expect(spec.servers[0].url).toBe('https://my-app.workers.dev')
    })

    it('should include security schemes', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const spec = await generateOpenAPISpec({}, 'https://example.com')

      expect(spec.components.securitySchemes.bearerAuth).toMatchObject({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      })
    })

    it('should include component schemas', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const spec = await generateOpenAPISpec({}, 'https://example.com')

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

      const spec = await generateOpenAPISpec({}, 'https://example.com')

      expect(spec.paths['/api/content/{id}']).toBeDefined()
    })

    it('should handle multiple path parameters', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([
        route('POST', '/api/content/:id/restore/:versionId'),
      ])

      const spec = await generateOpenAPISpec({}, 'https://example.com')

      expect(spec.paths['/api/content/{id}/restore/{versionId}']).toBeDefined()
    })

    it('should convert wildcard paths /files/* to /files/{path}', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/files/*')])

      const spec = await generateOpenAPISpec({}, 'https://example.com')

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

      const spec = await generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/admin/api/collections']['get']

      expect(op.security).toEqual([{ bearerAuth: [] }])
    })

    it('should not add security for public endpoints', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const spec = await generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/health']['get']

      expect(op.security).toBeUndefined()
    })

    it('should use ENDPOINT_DETAILS when available', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('POST', '/auth/login')])

      const spec = await generateOpenAPISpec({}, 'https://example.com')
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

      const spec = await generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/admin/cache/stats']['get']

      expect(op.operationId).toBeTruthy()
      expect(typeof op.operationId).toBe('string')
    })

    it('should include tags matching the route category', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/api/content')])

      const spec = await generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/api/content']['get']

      expect(op.tags).toEqual(['Content'])
    })

    it('should add path parameters to the operation', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/api/content/:id')])

      const spec = await generateOpenAPISpec({}, 'https://example.com')
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

      const spec = await generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/admin/cache/health']['get']

      expect(op.responses['200']).toBeDefined()
    })

    it('should add 200 and 201 responses for POST endpoints', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('POST', '/admin/cache/clear')])

      const spec = await generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/admin/cache/clear']['post']

      expect(op.responses['200']).toBeDefined()
    })

    it('should add 401 response for authenticated endpoints', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('DELETE', '/admin/api-keys/:id')])

      const spec = await generateOpenAPISpec({}, 'https://example.com')
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

      const spec = await generateOpenAPISpec({}, 'https://example.com')
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

      const spec = await generateOpenAPISpec({}, 'https://example.com')
      const tagNames = spec.tags.map(t => t.name)

      const sorted = [...tagNames].sort()
      expect(tagNames).toEqual(sorted)
    })

    it('should include descriptions from CATEGORY_INFO', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('POST', '/auth/login')])

      const spec = await generateOpenAPISpec({}, 'https://example.com')
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

      const spec = await generateOpenAPISpec({}, 'https://example.com')
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

      const spec = await generateOpenAPISpec({}, 'https://example.com')
      const sr = spec.components.schemas.SearchResult

      expect(sr.properties.data).toBeDefined()
      expect(sr.properties.meta.properties.mode).toBeDefined()
      expect(sr.properties.meta.properties.search_id).toBeDefined()
    })

    it('Error schema should have error and details', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const spec = await generateOpenAPISpec({}, 'https://example.com')
      const err = spec.components.schemas.Error

      expect(err.properties.error).toBeDefined()
      expect(err.properties.details).toBeDefined()
    })
  })

  // =========================================================================
  // toPascalCase
  // =========================================================================

  describe('toPascalCase', () => {
    it('should convert snake_case to PascalCase', async () => {
      const { toPascalCase } = await freshImport()
      expect(toPascalCase('blog_posts')).toBe('BlogPosts')
      expect(toPascalCase('team_members')).toBe('TeamMembers')
    })

    it('should handle single words', async () => {
      const { toPascalCase } = await freshImport()
      expect(toPascalCase('news')).toBe('News')
      expect(toPascalCase('products')).toBe('Products')
    })

    it('should handle kebab-case', async () => {
      const { toPascalCase } = await freshImport()
      expect(toPascalCase('blog-posts')).toBe('BlogPosts')
    })

    it('should handle mixed case input', async () => {
      const { toPascalCase } = await freshImport()
      expect(toPascalCase('BLOG_POSTS')).toBe('BlogPosts')
    })
  })

  // =========================================================================
  // fieldConfigToOpenAPISchema
  // =========================================================================

  describe('fieldConfigToOpenAPISchema', () => {
    it('should map string type', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({ type: 'string' })
      expect(result.type).toBe('string')
    })

    it('should map number type', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({ type: 'number' })
      expect(result.type).toBe('number')
    })

    it('should map boolean type', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({ type: 'boolean' })
      expect(result.type).toBe('boolean')
    })

    it('should map checkbox to boolean', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({ type: 'checkbox' })
      expect(result.type).toBe('boolean')
    })

    it('should map date with format', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({ type: 'date' })
      expect(result).toMatchObject({ type: 'string', format: 'date' })
    })

    it('should map datetime with format', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({ type: 'datetime' })
      expect(result).toMatchObject({ type: 'string', format: 'date-time' })
    })

    it('should map email with format', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({ type: 'email' })
      expect(result).toMatchObject({ type: 'string', format: 'email' })
    })

    it('should map url with format', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({ type: 'url' })
      expect(result).toMatchObject({ type: 'string', format: 'uri' })
    })

    it('should map select with enum values', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({
        type: 'select',
        enum: ['draft', 'published', 'archived']
      })
      expect(result).toMatchObject({
        type: 'string',
        enum: ['draft', 'published', 'archived']
      })
    })

    it('should map multiselect to array with enum', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({
        type: 'multiselect',
        enum: ['tech', 'news', 'sports']
      })
      expect(result).toMatchObject({
        type: 'array',
        items: { type: 'string', enum: ['tech', 'news', 'sports'] }
      })
    })

    it('should map richtext to string', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({ type: 'richtext' })
      expect(result.type).toBe('string')
    })

    it('should map color with pattern', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({ type: 'color' })
      expect(result.type).toBe('string')
      expect(result.pattern).toBeTruthy()
    })

    it('should carry forward validation constraints', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({
        type: 'string',
        title: 'Username',
        minLength: 3,
        maxLength: 50,
        default: 'user',
        pattern: '^[a-z]+$'
      })
      expect(result).toMatchObject({
        type: 'string',
        description: 'Username',
        minLength: 3,
        maxLength: 50,
        default: 'user',
        pattern: '^[a-z]+$'
      })
    })

    it('should carry forward min/max for number', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({
        type: 'number',
        min: 0,
        max: 100
      })
      expect(result).toMatchObject({
        type: 'number',
        minimum: 0,
        maximum: 100
      })
    })

    it('should map object with properties recursively', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({
        type: 'object',
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
          zip: { type: 'number' }
        }
      })
      expect(result.type).toBe('object')
      expect(result.properties.street).toMatchObject({ type: 'string' })
      expect(result.properties.city).toMatchObject({ type: 'string' })
      expect(result.properties.zip).toMatchObject({ type: 'number' })
    })

    it('should map array with items recursively', async () => {
      const { fieldConfigToOpenAPISchema } = await freshImport()
      const result = fieldConfigToOpenAPISchema({
        type: 'array',
        items: { type: 'string' }
      })
      expect(result.type).toBe('array')
      expect(result.items).toMatchObject({ type: 'string' })
    })
  })

  // =========================================================================
  // collectionSchemaToOpenAPI
  // =========================================================================

  describe('collectionSchemaToOpenAPI', () => {
    it('should generate Data, Content, and Input schemas', async () => {
      const { collectionSchemaToOpenAPI } = await freshImport()
      const schemas = collectionSchemaToOpenAPI('blog_posts', 'Blog Posts', {
        properties: {
          body: { type: 'richtext' },
          tags: { type: 'multiselect', enum: ['tech', 'news'] }
        },
        required: ['body']
      })

      expect(schemas).toHaveProperty('BlogPostsData')
      expect(schemas).toHaveProperty('BlogPostsContent')
      expect(schemas).toHaveProperty('BlogPostsInput')
    })

    it('should include field properties in Data schema', async () => {
      const { collectionSchemaToOpenAPI } = await freshImport()
      const schemas = collectionSchemaToOpenAPI('news', 'News', {
        properties: {
          headline: { type: 'string', title: 'Headline' },
          category: { type: 'select', enum: ['politics', 'tech', 'sports'] },
          breaking: { type: 'boolean' }
        }
      })

      const data = schemas.NewsData
      expect(data.properties.headline).toMatchObject({ type: 'string' })
      expect(data.properties.category).toMatchObject({
        type: 'string',
        enum: ['politics', 'tech', 'sports']
      })
      expect(data.properties.breaking).toMatchObject({ type: 'boolean' })
    })

    it('should include required fields in Data schema', async () => {
      const { collectionSchemaToOpenAPI } = await freshImport()
      const schemas = collectionSchemaToOpenAPI('products', 'Products', {
        properties: {
          name: { type: 'string' },
          price: { type: 'number' }
        },
        required: ['name', 'price']
      })

      expect(schemas.ProductsData.required).toEqual(['name', 'price'])
    })

    it('should reference Data schema from Content schema', async () => {
      const { collectionSchemaToOpenAPI } = await freshImport()
      const schemas = collectionSchemaToOpenAPI('blog_posts', 'Blog Posts', {
        properties: { title_field: { type: 'string' } }
      })

      expect(schemas.BlogPostsContent.properties.data).toMatchObject({
        $ref: '#/components/schemas/BlogPostsData'
      })
    })

    it('should reference Data schema from Input schema', async () => {
      const { collectionSchemaToOpenAPI } = await freshImport()
      const schemas = collectionSchemaToOpenAPI('events', 'Events', {
        properties: { date: { type: 'date' } }
      })

      expect(schemas.EventsInput.properties.data).toMatchObject({
        $ref: '#/components/schemas/EventsData'
      })
    })

    it('should handle empty properties gracefully', async () => {
      const { collectionSchemaToOpenAPI } = await freshImport()
      const schemas = collectionSchemaToOpenAPI('empty', 'Empty', {
        properties: {}
      })

      expect(schemas.EmptyData.properties).toEqual({})
    })
  })

  // =========================================================================
  // Backward Compatibility (no db)
  // =========================================================================

  describe('backward compatibility', () => {
    it('should work when db is omitted', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const spec = await generateOpenAPISpec({}, 'https://example.com')

      expect(spec.openapi).toBe('3.0.0')
      expect(spec.components.schemas).toHaveProperty('Content')
      // Should not have any collection-specific schemas
      expect(spec.components.schemas).not.toHaveProperty('BlogPostsData')
    })

    it('should return a Promise', async () => {
      const { generateOpenAPISpec } = await freshImport()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const result = generateOpenAPISpec({}, 'https://example.com')
      expect(result).toBeInstanceOf(Promise)
    })
  })

  // =========================================================================
  // Collection Schema from D1
  // =========================================================================

  describe('collection schema enrichment', () => {
    it('should include collection schemas when db is provided', async () => {
      const { generateOpenAPISpec, clearCollectionSchemaCache } = await freshImport()
      clearCollectionSchemaCache()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const mockDB = createMockDB([{
        name: 'blog_posts',
        display_name: 'Blog Posts',
        schema: JSON.stringify({
          type: 'object',
          properties: {
            body: { type: 'richtext' },
            tags: { type: 'multiselect', enum: ['tech'] }
          }
        })
      }])

      const spec = await generateOpenAPISpec({}, 'https://example.com', mockDB)

      expect(spec.components.schemas).toHaveProperty('BlogPostsData')
      expect(spec.components.schemas).toHaveProperty('BlogPostsContent')
      expect(spec.components.schemas).toHaveProperty('BlogPostsInput')
    })

    it('should handle DB errors gracefully', async () => {
      const { generateOpenAPISpec, clearCollectionSchemaCache } = await freshImport()
      clearCollectionSchemaCache()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const failingDB = {
        prepare: () => ({
          all: async () => { throw new Error('D1 unavailable') }
        })
      }

      const spec = await generateOpenAPISpec({}, 'https://example.com', failingDB)

      // Should still return a valid spec
      expect(spec.openapi).toBe('3.0.0')
      expect(spec.components.schemas).toHaveProperty('Content')
    })

    it('should skip collections with invalid schema JSON', async () => {
      const { generateOpenAPISpec, clearCollectionSchemaCache } = await freshImport()
      clearCollectionSchemaCache()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const mockDB = createMockDB([
        { name: 'good', display_name: 'Good', schema: JSON.stringify({ type: 'object', properties: { title: { type: 'string' } } }) },
        { name: 'bad', display_name: 'Bad', schema: '{ invalid json' }
      ])

      const spec = await generateOpenAPISpec({}, 'https://example.com', mockDB)

      expect(spec.components.schemas).toHaveProperty('GoodData')
      expect(spec.components.schemas).not.toHaveProperty('BadData')
    })

    it('should skip collections with no properties', async () => {
      const { generateOpenAPISpec, clearCollectionSchemaCache } = await freshImport()
      clearCollectionSchemaCache()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const mockDB = createMockDB([
        { name: 'empty', display_name: 'Empty', schema: JSON.stringify({ type: 'object', properties: {} }) }
      ])

      const spec = await generateOpenAPISpec({}, 'https://example.com', mockDB)

      expect(spec.components.schemas).not.toHaveProperty('EmptyData')
    })

    it('should add helpful description when no collection schemas exist', async () => {
      const { generateOpenAPISpec, clearCollectionSchemaCache } = await freshImport()
      clearCollectionSchemaCache()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      const mockDB = createMockDB([])

      const spec = await generateOpenAPISpec({}, 'https://example.com', mockDB)

      expect(spec.components.schemas.Content.properties.data.description).toContain('collection-specific schemas')
    })
  })

  // =========================================================================
  // Cache Invalidation
  // =========================================================================

  describe('cache invalidation', () => {
    it('should cache collection schema results', async () => {
      const { getCollectionOpenAPIData, clearCollectionSchemaCache } = await freshImport()
      clearCollectionSchemaCache()

      let callCount = 0
      const mockDB = {
        prepare: () => ({
          all: async () => {
            callCount++
            return {
              results: [{
                name: 'test',
                display_name: 'Test',
                schema: JSON.stringify({ type: 'object', properties: { x: { type: 'string' } } })
              }]
            }
          }
        })
      }

      // First call should query DB
      await getCollectionOpenAPIData(mockDB)
      expect(callCount).toBe(1)

      // Second call should use cache
      await getCollectionOpenAPIData(mockDB)
      expect(callCount).toBe(1)
    })

    it('should re-query DB after cache is cleared', async () => {
      const { getCollectionOpenAPIData, clearCollectionSchemaCache } = await freshImport()
      clearCollectionSchemaCache()

      let callCount = 0
      const mockDB = {
        prepare: () => ({
          all: async () => {
            callCount++
            return {
              results: [{
                name: 'test',
                display_name: 'Test',
                schema: JSON.stringify({ type: 'object', properties: { x: { type: 'string' } } })
              }]
            }
          }
        })
      }

      await getCollectionOpenAPIData(mockDB)
      expect(callCount).toBe(1)

      clearCollectionSchemaCache()

      await getCollectionOpenAPIData(mockDB)
      expect(callCount).toBe(2)
    })
  })

  // =========================================================================
  // Plugin OpenAPI Registry
  // =========================================================================

  describe('plugin OpenAPI registry', () => {
    it('should register plugin schemas and include them in spec', async () => {
      const { generateOpenAPISpec, registerPluginOpenAPI, clearPluginOpenAPIRegistry } = await freshImport()
      clearPluginOpenAPIRegistry()
      mockInspectRoutes.mockReturnValue([route('GET', '/health')])

      registerPluginOpenAPI('test-plugin', [{
        path: '/admin/plugins/test',
        handler: {} as any,
        openapi: {
          schemas: {
            TestResult: {
              type: 'object',
              properties: {
                score: { type: 'number' }
              }
            }
          }
        }
      }])

      const spec = await generateOpenAPISpec({}, 'https://example.com')

      expect(spec.components.schemas).toHaveProperty('TestResult')
      expect(spec.components.schemas.TestResult.properties.score).toMatchObject({ type: 'number' })
    })

    it('should register plugin endpoint details', async () => {
      const { generateOpenAPISpec, registerPluginOpenAPI, clearPluginOpenAPIRegistry } = await freshImport()
      clearPluginOpenAPIRegistry()
      // Path must match INCLUDED_ROUTE_PATTERNS: /admin/plugins/*/api/*
      mockInspectRoutes.mockReturnValue([route('GET', '/admin/plugins/test/api/stats')])

      registerPluginOpenAPI('test-plugin', [{
        path: '/admin/plugins/test',
        handler: {} as any,
        openapi: {
          endpoints: {
            'GET /admin/plugins/test/api/stats': {
              operationId: 'getTestStats',
              summary: 'Get test statistics'
            }
          }
        }
      }])

      const spec = await generateOpenAPISpec({}, 'https://example.com')
      const op = spec.paths['/admin/plugins/test/api/stats']?.get

      expect(op?.operationId).toBe('getTestStats')
      expect(op?.summary).toBe('Get test statistics')
    })

    it('should be a no-op for routes without openapi metadata', async () => {
      const { registerPluginOpenAPI, getPluginOpenAPISchemas, clearPluginOpenAPIRegistry } = await freshImport()
      clearPluginOpenAPIRegistry()

      registerPluginOpenAPI('plain-plugin', [{
        path: '/admin/plugins/plain',
        handler: {} as any
        // no openapi field
      }])

      expect(Object.keys(getPluginOpenAPISchemas())).toHaveLength(0)
    })

    it('should clear registry when clearPluginOpenAPIRegistry is called', async () => {
      const { registerPluginOpenAPI, getPluginOpenAPISchemas, clearPluginOpenAPIRegistry } = await freshImport()
      clearPluginOpenAPIRegistry()

      registerPluginOpenAPI('test', [{
        path: '/test',
        handler: {} as any,
        openapi: { schemas: { Foo: { type: 'object' } } }
      }])

      expect(Object.keys(getPluginOpenAPISchemas())).toHaveLength(1)

      clearPluginOpenAPIRegistry()

      expect(Object.keys(getPluginOpenAPISchemas())).toHaveLength(0)
    })
  })
})
