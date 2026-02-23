/**
 * OpenAPI Specification Generator
 *
 * Converts the route metadata registry into a complete OpenAPI 3.0.0 spec.
 * Uses Hono's inspectRoutes() for auto-discovery and enriches endpoints
 * with detailed parameter, request body, and response schemas.
 */

import {
  buildRouteList,
  CATEGORY_INFO,
  type RouteMetadata
} from './route-metadata'

// ============================================================================
// OpenAPI Types
// ============================================================================

interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    version: string
    description: string
    contact?: { name: string; url: string; email: string }
    license?: { name: string; url: string }
  }
  servers: Array<{ url: string; description: string }>
  paths: Record<string, Record<string, any>>
  components: {
    securitySchemes: Record<string, any>
    schemas: Record<string, any>
  }
  tags: Array<{ name: string; description: string }>
}

interface EndpointDetail {
  operationId?: string
  summary?: string
  parameters?: Array<{
    name: string
    in: 'path' | 'query' | 'header'
    required?: boolean
    description?: string
    schema: Record<string, any>
  }>
  requestBody?: {
    required?: boolean
    description?: string
    content: Record<string, { schema: Record<string, any> }>
  }
  responses?: Record<string, {
    description: string
    content?: Record<string, { schema: Record<string, any> }>
  }>
}

// ============================================================================
// Reusable Component Schemas
// ============================================================================

const COMPONENT_SCHEMAS: Record<string, any> = {
  Content: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', description: 'Unique content identifier' },
      title: { type: 'string', description: 'Content title' },
      slug: { type: 'string', description: 'URL-friendly slug' },
      status: { type: 'string', enum: ['draft', 'published', 'archived'], description: 'Publication status' },
      collectionId: { type: 'string', format: 'uuid', description: 'Parent collection ID' },
      data: { type: 'object', description: 'Collection-specific content fields' },
      created_at: { type: 'integer', description: 'Unix timestamp of creation' },
      updated_at: { type: 'integer', description: 'Unix timestamp of last update' }
    }
  },
  ContentInput: {
    type: 'object',
    required: ['collectionId', 'title'],
    properties: {
      collectionId: { type: 'string', description: 'Target collection ID' },
      title: { type: 'string', description: 'Content title' },
      slug: { type: 'string', description: 'URL-friendly slug (auto-generated if omitted)' },
      status: { type: 'string', enum: ['draft', 'published', 'archived'], default: 'draft' },
      data: { type: 'object', description: 'Collection-specific content fields' }
    }
  },
  Collection: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', description: 'Machine-readable collection name' },
      display_name: { type: 'string', description: 'Human-readable display name' },
      description: { type: 'string' },
      schema: { type: 'object', description: 'Field definitions and validation rules' },
      is_active: { type: 'integer', enum: [0, 1], description: '1 = active, 0 = inactive' }
    }
  },
  Media: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      filename: { type: 'string' },
      mimetype: { type: 'string' },
      size: { type: 'integer', description: 'File size in bytes' },
      r2_key: { type: 'string', description: 'R2 storage key' },
      url: { type: 'string', format: 'uri', description: 'Public file URL via /files/ proxy' }
    }
  },
  User: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
      created_at: { type: 'integer' }
    }
  },
  Error: {
    type: 'object',
    properties: {
      error: { type: 'string', description: 'Error message' },
      details: { type: 'string', description: 'Additional error details' }
    }
  },
  PaginatedResponse: {
    type: 'object',
    properties: {
      data: { type: 'array', items: { type: 'object' } },
      meta: {
        type: 'object',
        properties: {
          count: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
          timing: {
            type: 'object',
            properties: {
              total: { type: 'integer', description: 'Total response time in ms' },
              execution: { type: 'integer', description: 'Query execution time in ms' },
              unit: { type: 'string', example: 'ms' }
            }
          }
        }
      }
    }
  },
  SearchResult: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            slug: { type: 'string' },
            excerpt: { type: 'string' },
            score: { type: 'number', description: 'Relevance score' },
            collection: { type: 'string' }
          }
        }
      },
      meta: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          mode: { type: 'string', enum: ['ai', 'fts5', 'keyword', 'hybrid'] },
          total: { type: 'integer' },
          search_id: { type: 'string', description: 'Search session ID for click tracking' },
          facets: { type: 'object', description: 'Available facet counts' }
        }
      }
    }
  },
  APIKey: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      key_prefix: { type: 'string', description: 'First 8 chars of the key for identification' },
      permissions: { type: 'array', items: { type: 'string' } },
      expires_at: { type: 'string', format: 'date-time', nullable: true },
      created_at: { type: 'string', format: 'date-time' }
    }
  }
}

// ============================================================================
// Per-Endpoint OpenAPI Detail (enrichment beyond route-metadata.ts)
// ============================================================================

const ENDPOINT_DETAILS: Record<string, EndpointDetail> = {
  // --- Auth ---
  'POST /auth/login': {
    operationId: 'login',
    summary: 'Authenticate with credentials',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } } } } }
    },
    responses: {
      '200': { description: 'JWT token and user info', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { '$ref': '#/components/schemas/User' } } } } } },
      '401': { description: 'Invalid credentials' }
    }
  },
  'POST /auth/login/form': {
    operationId: 'loginForm',
    summary: 'Form-based login',
    requestBody: {
      required: true,
      content: { 'application/x-www-form-urlencoded': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } } } } }
    },
    responses: { '302': { description: 'Redirect to admin dashboard' }, '401': { description: 'Invalid credentials' } }
  },
  'POST /auth/register': {
    operationId: 'register',
    summary: 'Register new user',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password', minLength: 8 }, name: { type: 'string' } } } } }
    },
    responses: { '201': { description: 'User created' }, '400': { description: 'Invalid input or email exists' } }
  },
  'GET /auth/me': {
    operationId: 'getCurrentUser',
    summary: 'Get current user',
    responses: {
      '200': { description: 'Current user', content: { 'application/json': { schema: { '$ref': '#/components/schemas/User' } } } },
      '401': { description: 'Not authenticated' }
    }
  },
  'POST /auth/magic-link/request': {
    operationId: 'requestMagicLink',
    summary: 'Request magic link email',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } }
    }
  },
  'GET /auth/magic-link/verify': {
    operationId: 'verifyMagicLink',
    summary: 'Verify magic link token',
    parameters: [{ name: 'token', in: 'query', required: true, description: 'Magic link token from email', schema: { type: 'string' } }]
  },
  'POST /auth/otp/request': {
    operationId: 'requestOtp',
    summary: 'Request one-time password',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } }
    }
  },
  'POST /auth/otp/verify': {
    operationId: 'verifyOtp',
    summary: 'Verify OTP code',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['email', 'code'], properties: { email: { type: 'string', format: 'email' }, code: { type: 'string' } } } } }
    }
  },

  // --- Content API ---
  'GET /api/collections': {
    operationId: 'listCollections',
    summary: 'List all collections',
    responses: {
      '200': { description: 'Collections list', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { '$ref': '#/components/schemas/Collection' } }, meta: { type: 'object' } } } } } }
    }
  },
  'GET /api/collections/:collection/content': {
    operationId: 'getCollectionContent',
    summary: 'Get collection content',
    parameters: [
      { name: 'collection', in: 'path', required: true, description: 'Collection name', schema: { type: 'string' } },
      { name: 'limit', in: 'query', description: 'Max items to return (default: 50, max: 1000)', schema: { type: 'integer', default: 50, maximum: 1000 } },
      { name: 'offset', in: 'query', description: 'Number of items to skip', schema: { type: 'integer', default: 0 } },
      { name: 'status', in: 'query', description: 'Filter by publication status', schema: { type: 'string', enum: ['draft', 'published', 'archived'] } }
    ],
    responses: {
      '200': { description: 'Content items', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { '$ref': '#/components/schemas/Content' } }, meta: { type: 'object' } } } } } },
      '404': { description: 'Collection not found' }
    }
  },
  'GET /api/content/:id': {
    operationId: 'getContentById',
    summary: 'Get content by ID',
    responses: {
      '200': { description: 'Content item', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Content' } } } },
      '404': { description: 'Content not found' }
    }
  },
  'POST /api/content': {
    operationId: 'createContent',
    summary: 'Create content',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { '$ref': '#/components/schemas/ContentInput' } } }
    },
    responses: {
      '201': { description: 'Content created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Content' } } } },
      '400': { description: 'Invalid request body' },
      '401': { description: 'Authentication required' }
    }
  },
  'PUT /api/content/:id': {
    operationId: 'updateContent',
    summary: 'Update content',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { '$ref': '#/components/schemas/ContentInput' } } }
    },
    responses: {
      '200': { description: 'Content updated', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Content' } } } },
      '401': { description: 'Authentication required' },
      '404': { description: 'Content not found' }
    }
  },
  'DELETE /api/content/:id': {
    operationId: 'deleteContent',
    summary: 'Delete content',
    responses: {
      '200': { description: 'Content deleted' },
      '401': { description: 'Authentication required' },
      '404': { description: 'Content not found' }
    }
  },
  'GET /api/content/:id/versions': {
    operationId: 'getContentVersions',
    summary: 'Get version history',
    responses: {
      '200': { description: 'Version history', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, version: { type: 'integer' }, created_at: { type: 'integer' }, changes: { type: 'object' } } } } } } } } }
    }
  },
  'POST /api/content/:id/restore/:versionId': {
    operationId: 'restoreContentVersion',
    summary: 'Restore to a previous version'
  },

  // --- Media API ---
  'GET /api/media': {
    operationId: 'listMedia',
    summary: 'List media files',
    responses: {
      '200': { description: 'Media files', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { '$ref': '#/components/schemas/Media' } }, meta: { type: 'object' } } } } } }
    }
  },
  'POST /api/media/upload': {
    operationId: 'uploadMedia',
    summary: 'Upload a media file',
    requestBody: {
      required: true,
      description: 'Multipart form upload with a file field',
      content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } }
    },
    responses: {
      '201': { description: 'File uploaded', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, file: { '$ref': '#/components/schemas/Media' } } } } } },
      '401': { description: 'Authentication required' }
    }
  },
  'DELETE /api/media/:id': {
    operationId: 'deleteMedia',
    summary: 'Delete a media file',
    responses: { '200': { description: 'Media deleted' }, '404': { description: 'Media not found' } }
  },

  // --- Search ---
  'GET /api/search': {
    operationId: 'search',
    summary: 'Search content',
    parameters: [
      { name: 'q', in: 'query', required: true, description: 'Search query string', schema: { type: 'string' } },
      { name: 'mode', in: 'query', description: 'Search mode', schema: { type: 'string', enum: ['ai', 'fts5', 'keyword', 'hybrid'], default: 'hybrid' } },
      { name: 'collection', in: 'query', description: 'Filter by collection name', schema: { type: 'string' } },
      { name: 'limit', in: 'query', description: 'Max results (default: 10)', schema: { type: 'integer', default: 10 } },
      { name: 'facets', in: 'query', description: 'Enable faceted search (true/false)', schema: { type: 'string', enum: ['true', 'false'] } },
      { name: 'facet_filters', in: 'query', description: 'JSON-encoded facet filter object', schema: { type: 'string' } }
    ],
    responses: {
      '200': { description: 'Search results', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SearchResult' } } } }
    }
  },
  'POST /api/search/click': {
    operationId: 'trackSearchClick',
    summary: 'Track search result click',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['search_id', 'content_id'], properties: { search_id: { type: 'string' }, content_id: { type: 'string' }, position: { type: 'integer' } } } } }
    }
  },

  // --- API Keys ---
  'GET /admin/api-keys/api/keys': {
    operationId: 'listApiKeys',
    summary: 'List API keys',
    responses: {
      '200': { description: 'API keys', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { '$ref': '#/components/schemas/APIKey' } } } } } } }
    }
  },
  'POST /admin/api-keys/api/keys': {
    operationId: 'createApiKey',
    summary: 'Create API key',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, permissions: { type: 'array', items: { type: 'string' } }, expires_at: { type: 'string', format: 'date-time', nullable: true } } } } }
    },
    responses: {
      '201': { description: 'API key created (includes full key — only shown once)', content: { 'application/json': { schema: { type: 'object', properties: { key: { type: 'string', description: 'Full API key (only returned at creation)' }, id: { type: 'string' } } } } } }
    }
  },

  // --- Workflow ---
  'GET /workflow/status/:id': {
    operationId: 'getWorkflowStatus',
    summary: 'Get workflow status'
  },
  'POST /workflow/submit/:id': {
    operationId: 'submitForReview',
    summary: 'Submit content for review'
  },
  'POST /workflow/approve/:id': {
    operationId: 'approveContent',
    summary: 'Approve content'
  },
  'POST /workflow/reject/:id': {
    operationId: 'rejectContent',
    summary: 'Reject content'
  },
  'POST /workflow/publish/:id': {
    operationId: 'publishContent',
    summary: 'Publish approved content'
  },
  'POST /workflow/unpublish/:id': {
    operationId: 'unpublishContent',
    summary: 'Unpublish content'
  },
  'GET /workflow/history/:id': {
    operationId: 'getWorkflowHistory',
    summary: 'Get workflow history'
  },

  // --- Forms ---
  'POST /forms/:formId/submit': {
    operationId: 'submitForm',
    summary: 'Submit a form',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', description: 'Form field values (varies by form definition)' } } }
    }
  },
  'GET /forms/:formId': {
    operationId: 'getFormDefinition',
    summary: 'Get form definition for rendering'
  },

  // --- System ---
  'GET /health': {
    operationId: 'healthCheck',
    summary: 'Health check'
  },
  'GET /api/health': {
    operationId: 'apiHealthCheck',
    summary: 'API health check',
    responses: {
      '200': { description: 'API health status', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'healthy' }, timestamp: { type: 'string', format: 'date-time' }, schemas: { type: 'array', items: { type: 'string' } } } } } } }
    }
  },
  'GET /api': {
    operationId: 'getOpenAPISpec',
    summary: 'OpenAPI specification'
  },

  // --- Files ---
  'GET /files/*': {
    operationId: 'serveFile',
    summary: 'Serve file from R2 storage',
    parameters: [
      { name: 'path', in: 'path', required: true, description: 'File path (R2 object key)', schema: { type: 'string' } }
    ]
  }
}

// ============================================================================
// Generator Functions
// ============================================================================

/**
 * Convert Hono-style path params (:id) to OpenAPI-style ({id})
 */
function convertPathParams(path: string): string {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}')
}

/**
 * Extract path parameters from a route path
 */
function extractPathParams(path: string): string[] {
  const matches = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g)
  return matches ? matches.map(m => m.slice(1)) : []
}

/**
 * Generate an operationId from method + path when not explicitly provided
 */
function generateOperationId(method: string, path: string): string {
  const parts = path
    .replace(/^\//, '')
    .replace(/\/\*/g, '')
    .split('/')
    .filter(p => !p.startsWith(':') && !p.startsWith('{'))
    .map((p, i) => {
      if (i === 0) return p.replace(/-/g, '')
      return p.charAt(0).toUpperCase() + p.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    })

  const prefix = method.toLowerCase()
  const suffix = parts.join('')

  return `${prefix}${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}`
}

/**
 * Build tags array from categories that have endpoints
 */
function buildTags(routes: RouteMetadata[]): Array<{ name: string; description: string }> {
  const usedCategories = new Set(routes.map(r => r.category))
  const tags: Array<{ name: string; description: string }> = []

  for (const category of usedCategories) {
    const info = CATEGORY_INFO[category]
    tags.push({
      name: category,
      description: info ? info.description : category
    })
  }

  // Sort alphabetically
  tags.sort((a, b) => a.name.localeCompare(b.name))
  return tags
}

/**
 * Build an OpenAPI operation object for a single endpoint
 */
function buildOperation(route: RouteMetadata): Record<string, any> {
  const key = `${route.method} ${route.path}`
  const detail = ENDPOINT_DETAILS[key]

  const operation: Record<string, any> = {
    operationId: detail?.operationId || generateOperationId(route.method, route.path),
    summary: detail?.summary || route.description || `${route.method} ${route.path}`,
    description: route.description || undefined,
    tags: [route.category]
  }

  // Security — authenticated endpoints need bearer token
  if (route.authentication === true) {
    operation.security = [{ bearerAuth: [] }]
  }

  // Parameters — combine path params (auto-detected) with explicit ones
  const pathParamNames = extractPathParams(route.path)
  const explicitParams = detail?.parameters || []
  const explicitParamNames = new Set(explicitParams.map(p => p.name))

  const allParams: any[] = []

  // Add auto-detected path params that aren't explicitly defined
  for (const paramName of pathParamNames) {
    if (!explicitParamNames.has(paramName)) {
      allParams.push({
        name: paramName,
        in: 'path',
        required: true,
        schema: { type: 'string' }
      })
    }
  }

  // Add explicitly defined params
  allParams.push(...explicitParams)

  if (allParams.length > 0) {
    operation.parameters = allParams
  }

  // Request body
  if (detail?.requestBody) {
    operation.requestBody = detail.requestBody
  }

  // Responses
  if (detail?.responses) {
    operation.responses = detail.responses
  } else {
    // Default responses based on method
    operation.responses = buildDefaultResponses(route)
  }

  return operation
}

/**
 * Build default response schema for endpoints without explicit responses
 */
function buildDefaultResponses(route: RouteMetadata): Record<string, any> {
  const responses: Record<string, any> = {}

  switch (route.method) {
    case 'GET':
      responses['200'] = {
        description: 'Successful response',
        content: { 'application/json': { schema: { type: 'object' } } }
      }
      break
    case 'POST':
      responses['200'] = { description: 'Successful response' }
      responses['201'] = { description: 'Resource created' }
      break
    case 'PUT':
    case 'PATCH':
      responses['200'] = { description: 'Resource updated' }
      break
    case 'DELETE':
      responses['200'] = { description: 'Resource deleted' }
      break
    default:
      responses['200'] = { description: 'Successful response' }
  }

  if (route.authentication === true) {
    responses['401'] = { description: 'Authentication required' }
  }

  return responses
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate a complete OpenAPI 3.0.0 specification from auto-discovered routes
 *
 * @param app - Hono app instance for route introspection
 * @param serverUrl - Base server URL (e.g., https://my-app.workers.dev)
 */
export function generateOpenAPISpec(app: any, serverUrl: string): OpenAPISpec {
  const routes = buildRouteList(app)
  const tags = buildTags(routes)

  // Build paths object
  const paths: Record<string, Record<string, any>> = {}

  for (const route of routes) {
    const openApiPath = convertPathParams(route.path)

    // Handle wildcard paths: /files/* → /files/{path}
    const normalizedPath = openApiPath.replace(/\/\*$/, '/{path}')

    if (!paths[normalizedPath]) {
      paths[normalizedPath] = {}
    }

    const method = route.method.toLowerCase()
    paths[normalizedPath][method] = buildOperation(route)
  }

  return {
    openapi: '3.0.0',
    info: {
      title: 'SonicJS API',
      version: '1.0.0',
      description: 'RESTful API for SonicJS headless CMS — a modern, AI-powered content management system built on Cloudflare Workers. Features include content management, media handling, full-text and AI-powered search, workflow management, and more.',
      contact: {
        name: 'SonicJS',
        url: 'https://sonicjs.com',
        email: 'support@sonicjs.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: serverUrl,
        description: 'Current server'
      }
    ],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token. Obtain via POST /auth/login'
        }
      },
      schemas: COMPONENT_SCHEMAS
    },
    tags
  }
}
