/**
 * Route Metadata Service
 *
 * Auto-discovers API routes using Hono's inspectRoutes() and enriches them
 * with metadata from a static registry. Routes without metadata still appear
 * as "auto-discovered" — nothing is ever invisible.
 */

import { inspectRoutes } from 'hono/dev'

// ============================================================================
// Types
// ============================================================================

export interface RouteMetadata {
  method: string
  path: string
  description: string
  authentication: boolean | 'unknown'
  category: string
  documented: boolean
}

interface RouteMeta {
  description: string
  authentication: boolean
  category: string
}

export interface CategoryInfo {
  title: string
  description: string
  icon: string
}

// ============================================================================
// App Instance Storage
// ============================================================================

let appInstance: any = null

export function setAppInstance(app: any): void {
  appInstance = app
}

export function getAppInstance(): any {
  return appInstance
}

// ============================================================================
// Category Information
// ============================================================================

export const CATEGORY_INFO: Record<string, CategoryInfo> = {
  'Auth': {
    title: 'Authentication',
    description: 'User authentication and authorization endpoints',
    icon: '&#x1f510;'
  },
  'Content': {
    title: 'Content Management',
    description: 'Content creation, retrieval, and management',
    icon: '&#x1f4dd;'
  },
  'Media': {
    title: 'Media Management',
    description: 'File upload, storage, and media operations',
    icon: '&#x1f5bc;&#xfe0f;'
  },
  'Admin': {
    title: 'Admin Interface',
    description: 'Administrative panel and management features',
    icon: '&#x2699;&#xfe0f;'
  },
  'System': {
    title: 'System',
    description: 'Health checks and system information',
    icon: '&#x1f527;'
  },
  'Search': {
    title: 'Search',
    description: 'AI-powered search, full-text search, and analytics',
    icon: '&#x1f50d;'
  },
  'API Keys': {
    title: 'API Keys',
    description: 'API key management and authentication',
    icon: '&#x1f511;'
  },
  'Workflow': {
    title: 'Workflow',
    description: 'Content workflow and approval processes',
    icon: '&#x1f504;'
  },
  'Cache': {
    title: 'Cache',
    description: 'Cache management and invalidation',
    icon: '&#x26a1;'
  },
  'Forms': {
    title: 'Forms',
    description: 'Form submissions and management',
    icon: '&#x1f4cb;'
  },
  'Files': {
    title: 'Files',
    description: 'File serving from R2 storage',
    icon: '&#x1f4c1;'
  }
}

// ============================================================================
// Route Metadata Registry
// ============================================================================

const ROUTE_METADATA: Record<string, RouteMeta> = {
  // ── Auth ──────────────────────────────────────────────────────────────
  'POST /auth/login': { description: 'Authenticate user with email and password (returns JWT)', category: 'Auth', authentication: false },
  'POST /auth/login/form': { description: 'Form-based login (sets session cookie)', category: 'Auth', authentication: false },
  'POST /auth/register': { description: 'Register a new user account', category: 'Auth', authentication: false },
  'POST /auth/register/form': { description: 'Form-based registration (sets session cookie)', category: 'Auth', authentication: false },
  'POST /auth/logout': { description: 'Log out the current user and invalidate session', category: 'Auth', authentication: true },
  'GET /auth/me': { description: 'Get current authenticated user information', category: 'Auth', authentication: true },
  'POST /auth/refresh': { description: 'Refresh authentication token', category: 'Auth', authentication: true },
  'POST /auth/seed-admin': { description: 'Create or reset the admin user account', category: 'Auth', authentication: false },
  'POST /auth/accept-invitation': { description: 'Accept a user invitation', category: 'Auth', authentication: false },
  'POST /auth/request-password-reset': { description: 'Request a password reset email', category: 'Auth', authentication: false },
  'POST /auth/reset-password': { description: 'Reset password with reset token', category: 'Auth', authentication: false },
  'POST /auth/magic-link/request': { description: 'Request a magic link login email', category: 'Auth', authentication: false },
  'GET /auth/magic-link/verify': { description: 'Verify magic link token and authenticate', category: 'Auth', authentication: false },
  'POST /auth/otp/request': { description: 'Request a one-time password via email', category: 'Auth', authentication: false },
  'POST /auth/otp/verify': { description: 'Verify OTP code and authenticate', category: 'Auth', authentication: false },
  'POST /auth/otp/resend': { description: 'Resend a one-time password', category: 'Auth', authentication: false },

  // ── Content (Public API) ─────────────────────────────────────────────
  'GET /api': { description: 'OpenAPI 3.0 specification (auto-discovered)', category: 'System', authentication: false },
  'GET /api/health': { description: 'API health check with schema information', category: 'System', authentication: false },
  'GET /api/collections': { description: 'List all available collections', category: 'Content', authentication: false },
  'GET /api/collections/:collection/content': { description: 'Get content items from a specific collection', category: 'Content', authentication: false },
  'GET /api/content': { description: 'List content items with advanced filtering', category: 'Content', authentication: false },
  'GET /api/content/check-slug': { description: 'Check if a content slug is available', category: 'Content', authentication: false },
  'GET /api/content/:id': { description: 'Get a specific content item by ID', category: 'Content', authentication: false },
  'POST /api/content': { description: 'Create a new content item', category: 'Content', authentication: true },
  'PUT /api/content/:id': { description: 'Update an existing content item', category: 'Content', authentication: true },
  'DELETE /api/content/:id': { description: 'Delete a content item', category: 'Content', authentication: true },

  // ── Media (Public API) ───────────────────────────────────────────────
  'POST /api/media/upload': { description: 'Upload a media file to R2 storage', category: 'Media', authentication: true },
  'POST /api/media/upload-multiple': { description: 'Upload multiple media files', category: 'Media', authentication: true },
  'POST /api/media/bulk-delete': { description: 'Delete multiple media files', category: 'Media', authentication: true },
  'POST /api/media/create-folder': { description: 'Create a folder in media storage', category: 'Media', authentication: true },
  'POST /api/media/bulk-move': { description: 'Move multiple media files to a folder', category: 'Media', authentication: true },
  'DELETE /api/media/:id': { description: 'Delete a media file from storage', category: 'Media', authentication: true },
  'PATCH /api/media/:id': { description: 'Update media file metadata', category: 'Media', authentication: true },

  // ── System ───────────────────────────────────────────────────────────
  'GET /health': { description: 'Health check endpoint for monitoring', category: 'System', authentication: false },
  'GET /api/system/info': { description: 'Get system information and version', category: 'System', authentication: false },
  'GET /api/system/schema': { description: 'Get database schema information', category: 'System', authentication: false },

  // ── Search (Public API) ──────────────────────────────────────────────
  'POST /api/search': { description: 'Search content using AI, FTS5, keyword, or hybrid mode', category: 'Search', authentication: false },
  'GET /api/search/suggest': { description: 'Get search suggestions and autocomplete', category: 'Search', authentication: false },
  'POST /api/search/click': { description: 'Track a search result click for analytics', category: 'Search', authentication: false },
  'POST /api/search/facet-click': { description: 'Track a facet interaction for analytics', category: 'Search', authentication: false },
  'GET /api/search/analytics': { description: 'Get public search analytics', category: 'Search', authentication: false },
  'GET /api/search/related': { description: 'Get related searches for a query', category: 'Search', authentication: false },
  'GET /api/search/trending': { description: 'Get trending search queries', category: 'Search', authentication: false },

  // ── Search Admin ─────────────────────────────────────────────────────
  'GET /admin/plugins/ai-search/api/settings': { description: 'Get search plugin settings', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/new-collections': { description: 'Get collections not yet indexed', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/status': { description: 'Get search plugin status and configuration', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/reindex': { description: 'Trigger full content reindex', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/fts5/status': { description: 'Get FTS5 full-text search status', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/fts5/index-collection': { description: 'Index a collection for FTS5 search', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/fts5/reindex-all': { description: 'Rebuild entire FTS5 search index', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/vectorize/reindex-all': { description: 'Rebuild entire Vectorize semantic index', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/relevance/preview': { description: 'Preview relevance pipeline results', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/relevance/pipeline': { description: 'Get relevance pipeline configuration', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/relevance/pipeline': { description: 'Update relevance pipeline configuration', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/relevance/content-scores': { description: 'Get content boost scores', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/relevance/content-scores': { description: 'Set content boost scores', category: 'Search', authentication: true },
  'DELETE /admin/plugins/ai-search/api/relevance/content-scores': { description: 'Clear content boost scores', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/relevance/synonyms': { description: 'List search synonyms', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/relevance/synonyms': { description: 'Add a search synonym', category: 'Search', authentication: true },
  'PUT /admin/plugins/ai-search/api/relevance/synonyms/:id': { description: 'Update a search synonym', category: 'Search', authentication: true },
  'DELETE /admin/plugins/ai-search/api/relevance/synonyms/:id': { description: 'Delete a search synonym', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/relevance/synonyms/import': { description: 'Import synonyms from file', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/relevance/rules': { description: 'List search query rules', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/relevance/rules': { description: 'Create a query rule', category: 'Search', authentication: true },
  'PUT /admin/plugins/ai-search/api/relevance/rules/:id': { description: 'Update a query rule', category: 'Search', authentication: true },
  'DELETE /admin/plugins/ai-search/api/relevance/rules/:id': { description: 'Delete a query rule', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/related-searches': { description: 'List related search mappings', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/related-searches': { description: 'Create a related search mapping', category: 'Search', authentication: true },
  'PUT /admin/plugins/ai-search/api/related-searches/:id': { description: 'Update a related search mapping', category: 'Search', authentication: true },
  'DELETE /admin/plugins/ai-search/api/related-searches/cache': { description: 'Clear related searches cache', category: 'Search', authentication: true },
  'DELETE /admin/plugins/ai-search/api/related-searches/:id': { description: 'Delete a related search mapping', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/related-searches/bulk': { description: 'Bulk import related searches', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/facets/discover': { description: 'Discover available facets from content', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/facets/config': { description: 'Get facet configuration', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/facets/config': { description: 'Update facet configuration', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/facets/auto-generate': { description: 'Auto-generate facet configuration', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/seed/clicks': { description: 'Generate seed click data for testing', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/seed/facet-clicks': { description: 'Generate seed facet click data', category: 'Search', authentication: true },
  'DELETE /admin/plugins/ai-search/api/seed/clicks': { description: 'Clear seeded click data', category: 'Search', authentication: true },
  'DELETE /admin/plugins/ai-search/api/seed/facet-clicks': { description: 'Clear seeded facet click data', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/analytics/extended': { description: 'Get extended search analytics', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/benchmark/datasets': { description: 'List available benchmark datasets', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/benchmark/status': { description: 'Get benchmark status', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/benchmark/seed': { description: 'Seed benchmark dataset', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/benchmark/purge': { description: 'Purge benchmark data', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/benchmark/index-fts5-batch': { description: 'Index benchmark data for FTS5', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/benchmark/index-vectorize-batch': { description: 'Batch index benchmark data for Vectorize', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/benchmark/index-vectorize': { description: 'Index benchmark data for Vectorize', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/benchmark/evaluate': { description: 'Evaluate search quality against benchmark', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/benchmark/query-ids': { description: 'Get benchmark query IDs', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/benchmark/evaluate-batch': { description: 'Batch evaluate search quality', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/agent/run': { description: 'Run search quality analysis', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/agent/status': { description: 'Get quality agent status', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/agent/recommendations': { description: 'Get quality improvement recommendations', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/agent/recommendations/:id/apply': { description: 'Apply a quality recommendation', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/agent/recommendations/:id/dismiss': { description: 'Dismiss a quality recommendation', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/agent/recommendations/dismiss-all': { description: 'Dismiss all quality recommendations', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/agent/runs': { description: 'Get history of quality agent runs', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/experiments': { description: 'List search A/B test experiments', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/experiments': { description: 'Create a search A/B test experiment', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/experiments/:id': { description: 'Get experiment details', category: 'Search', authentication: true },
  'PUT /admin/plugins/ai-search/api/experiments/:id': { description: 'Update an experiment', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/experiments/:id/start': { description: 'Start an experiment', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/experiments/:id/pause': { description: 'Pause a running experiment', category: 'Search', authentication: true },
  'POST /admin/plugins/ai-search/api/experiments/:id/complete': { description: 'Complete an experiment', category: 'Search', authentication: true },
  'DELETE /admin/plugins/ai-search/api/experiments/:id': { description: 'Delete an experiment', category: 'Search', authentication: true },
  'GET /admin/plugins/ai-search/api/experiments/:id/metrics': { description: 'Get experiment metrics and statistics', category: 'Search', authentication: true },

  // ── Admin API ────────────────────────────────────────────────────────
  'GET /admin/api/stats': { description: 'Get dashboard statistics (collections, content, media, users)', category: 'Admin', authentication: true },
  'GET /admin/api/storage': { description: 'Get storage usage information', category: 'Admin', authentication: true },
  'GET /admin/api/activity': { description: 'Get recent activity logs', category: 'Admin', authentication: true },
  'GET /admin/api/collections': { description: 'List all collections with field counts', category: 'Admin', authentication: true },
  'GET /admin/api/collections/:id': { description: 'Get a collection with its fields', category: 'Admin', authentication: true },
  'GET /admin/api/references': { description: 'Get reference options for a collection', category: 'Admin', authentication: true },
  'POST /admin/api/collections': { description: 'Create a new collection', category: 'Admin', authentication: true },
  'PATCH /admin/api/collections/:id': { description: 'Update an existing collection', category: 'Admin', authentication: true },
  'DELETE /admin/api/collections/:id': { description: 'Delete a collection', category: 'Admin', authentication: true },
  'GET /admin/api/migrations/status': { description: 'Get database migration status', category: 'Admin', authentication: true },
  'POST /admin/api/migrations/run': { description: 'Run pending database migrations', category: 'Admin', authentication: true },
  'GET /admin/api/migrations/validate': { description: 'Validate database migration integrity', category: 'Admin', authentication: true },

  // ── API Keys ─────────────────────────────────────────────────────────
  'GET /admin/api-keys': { description: 'List all API keys', category: 'API Keys', authentication: true },
  'POST /admin/api-keys': { description: 'Create a new API key', category: 'API Keys', authentication: true },
  'PATCH /admin/api-keys/:id': { description: 'Update an API key', category: 'API Keys', authentication: true },
  'DELETE /admin/api-keys/:id': { description: 'Revoke an API key', category: 'API Keys', authentication: true },

  // ── Cache ────────────────────────────────────────────────────────────
  'GET /admin/cache/stats': { description: 'Get cache statistics', category: 'Cache', authentication: true },
  'GET /admin/cache/stats/:namespace': { description: 'Get cache statistics for a namespace', category: 'Cache', authentication: true },
  'POST /admin/cache/clear': { description: 'Clear all cache entries', category: 'Cache', authentication: true },
  'POST /admin/cache/clear/:namespace': { description: 'Clear cache entries for a namespace', category: 'Cache', authentication: true },
  'POST /admin/cache/invalidate': { description: 'Invalidate cache entries by pattern', category: 'Cache', authentication: true },
  'GET /admin/cache/health': { description: 'Get cache health status', category: 'Cache', authentication: true },
  'GET /admin/cache/browser/:namespace/:key': { description: 'Get a specific cache entry', category: 'Cache', authentication: true },
  'GET /admin/cache/analytics': { description: 'Get cache analytics overview', category: 'Cache', authentication: true },
  'GET /admin/cache/analytics/trends': { description: 'Get cache usage trends over time', category: 'Cache', authentication: true },
  'GET /admin/cache/analytics/top-keys': { description: 'Get most frequently accessed cache keys', category: 'Cache', authentication: true },
  'POST /admin/cache/warm': { description: 'Warm cache with data', category: 'Cache', authentication: true },
  'POST /admin/cache/warm/:namespace': { description: 'Warm cache for a specific namespace', category: 'Cache', authentication: true },

  // ── Workflow ─────────────────────────────────────────────────────────
  'GET /workflow/status/:id': { description: 'Get workflow status for a content item', category: 'Workflow', authentication: true },
  'POST /workflow/submit/:id': { description: 'Submit content for review', category: 'Workflow', authentication: true },
  'POST /workflow/approve/:id': { description: 'Approve content in review', category: 'Workflow', authentication: true },
  'POST /workflow/reject/:id': { description: 'Reject content in review', category: 'Workflow', authentication: true },
  'POST /workflow/publish/:id': { description: 'Publish approved content', category: 'Workflow', authentication: true },
  'POST /workflow/unpublish/:id': { description: 'Unpublish content', category: 'Workflow', authentication: true },
  'GET /workflow/history/:id': { description: 'Get workflow history for a content item', category: 'Workflow', authentication: true },

  // ── Forms (Public) ───────────────────────────────────────────────────
  'GET /forms/:identifier/turnstile-config': { description: 'Get Turnstile CAPTCHA config for a form', category: 'Forms', authentication: false },
  'GET /forms/:identifier/schema': { description: 'Get form schema for client-side rendering', category: 'Forms', authentication: false },
  'GET /forms/:name': { description: 'Get form definition for rendering', category: 'Forms', authentication: false },
  'POST /forms/:identifier/submit': { description: 'Submit a form (public endpoint)', category: 'Forms', authentication: false },
  'GET /api/forms/:identifier/turnstile-config': { description: 'Get Turnstile config via API', category: 'Forms', authentication: false },
  'GET /api/forms/:identifier/schema': { description: 'Get form schema via API', category: 'Forms', authentication: false },
  'GET /api/forms/:name': { description: 'Get form definition via API', category: 'Forms', authentication: false },
  'POST /api/forms/:identifier/submit': { description: 'Submit a form via API', category: 'Forms', authentication: false },

  // ── Files ────────────────────────────────────────────────────────────
  'GET /files/*': { description: 'Serve files from R2 storage (public access)', category: 'Files', authentication: false },

  // ── Database Tools ───────────────────────────────────────────────────
  'GET /admin/database-tools/api/stats': { description: 'Get database statistics', category: 'Admin', authentication: true },
  'POST /admin/database-tools/api/truncate': { description: 'Truncate database tables', category: 'Admin', authentication: true },
  'POST /admin/database-tools/api/backup': { description: 'Create a database backup', category: 'Admin', authentication: true },
  'GET /admin/database-tools/api/validate': { description: 'Validate database integrity', category: 'Admin', authentication: true },
  'GET /admin/database-tools/api/tables/:tableName': { description: 'Get table schema and sample data', category: 'Admin', authentication: true },
  'GET /admin/database-tools/tables/:tableName': { description: 'Get table details', category: 'Admin', authentication: true },

  // ── Seed Data ────────────────────────────────────────────────────────
  'POST /admin/seed-data/settings': { description: 'Update seed data settings', category: 'Admin', authentication: true },
  'POST /admin/seed-data/generate/users': { description: 'Generate seed users', category: 'Admin', authentication: true },
  'POST /admin/seed-data/generate/content': { description: 'Generate seed content', category: 'Admin', authentication: true },
  'POST /admin/seed-data/generate/forms': { description: 'Generate seed forms', category: 'Admin', authentication: true },
  'POST /admin/seed-data/generate/submissions': { description: 'Generate seed form submissions', category: 'Admin', authentication: true },
  'POST /admin/seed-data/generate': { description: 'Generate all seed data', category: 'Admin', authentication: true },
  'POST /admin/seed-data/clear': { description: 'Clear all seed data', category: 'Admin', authentication: true },

  // ── Email Plugin ─────────────────────────────────────────────────────
  'POST /admin/plugins/email/settings': { description: 'Update email plugin settings', category: 'Admin', authentication: true },
  'POST /admin/plugins/email/test': { description: 'Send a test email', category: 'Admin', authentication: true },
}

// ============================================================================
// Whitelist Patterns for API routes
// ============================================================================

const INCLUDED_ROUTE_PATTERNS: RegExp[] = [
  /^\/api\//,                        // All /api/* routes
  /^\/api$/,                         // API root
  /^\/auth\//,                       // All auth routes (HTML pages excluded below)
  /^\/admin\/api\//,                 // Admin API endpoints
  /^\/admin\/api-keys/,              // API key management (no /api/ segment)
  /^\/admin\/cache\//,               // Cache management (no /api/ segment)
  /^\/admin\/plugins\/.*\/api\//,    // Plugin API endpoints (with /api/ segment)
  /^\/admin\/plugins\/email\//,      // Email plugin (no /api/ segment)
  /^\/admin\/database-tools\//,      // Database tools (mixed /api/ and non-/api/)
  /^\/admin\/seed-data\//,           // Seed data (no /api/ segment)
  /^\/workflow\//,                   // Workflow endpoints
  /^\/health$/,                      // Health check
  /^\/files\//,                      // File serving
  /^\/forms\//,                      // Public form endpoints
]

// Routes to always exclude (even if they match an include pattern)
const EXCLUDED_ROUTES = new Set([
  'GET /auth/login',
  'GET /auth/register',
  'GET /auth/login/form',
  'GET /auth/accept-invitation',
  'GET /auth/reset-password',
  'GET /auth/logout',
  'GET /admin/cache/browser',        // Cache browser HTML page
])

// ============================================================================
// Route Discovery
// ============================================================================

let cachedRouteList: RouteMetadata[] | null = null

function isIncludedRoute(method: string, path: string): boolean {
  // Check exclusions first
  const key = `${method} ${path}`
  if (EXCLUDED_ROUTES.has(key)) {
    return false
  }

  // Check if the path matches any include pattern
  return INCLUDED_ROUTE_PATTERNS.some(pattern => pattern.test(path))
}

function inferCategory(path: string): string {
  if (path.startsWith('/auth/')) return 'Auth'
  if (path.startsWith('/api/search')) return 'Search'
  if (path.startsWith('/api/media')) return 'Media'
  if (path.startsWith('/api/system')) return 'System'
  if (path.startsWith('/api/content') || path.startsWith('/api/collections')) return 'Content'
  if (path.startsWith('/api/forms')) return 'Forms'
  if (path.startsWith('/admin/api-keys')) return 'API Keys'
  if (path.startsWith('/admin/cache')) return 'Cache'
  if (path.startsWith('/admin/plugins/ai-search')) return 'Search'
  if (path.startsWith('/admin/api')) return 'Admin'
  if (path.startsWith('/admin/database-tools')) return 'Admin'
  if (path.startsWith('/admin/seed-data')) return 'Admin'
  if (path.startsWith('/admin/plugins/email')) return 'Admin'
  if (path.startsWith('/workflow/')) return 'Workflow'
  if (path.startsWith('/forms/')) return 'Forms'
  if (path.startsWith('/files/')) return 'Files'
  if (path === '/health' || path.startsWith('/api')) return 'System'
  return 'Other'
}

function inferAuth(path: string): boolean | 'unknown' {
  // Known public routes
  if (path === '/health' || path === '/api' || path === '/api/health') return false
  if (path === '/api/system/info' || path === '/api/system/schema') return false
  if (path.startsWith('/files/')) return false
  if (path.startsWith('/forms/') || path.startsWith('/api/forms/')) return false

  // Admin routes require auth
  if (path.startsWith('/admin/')) return true
  if (path.startsWith('/workflow/')) return true

  return 'unknown'
}

export function buildRouteList(app: any): RouteMetadata[] {
  if (cachedRouteList) return cachedRouteList

  if (!app) return []

  try {
    const routes = inspectRoutes(app as any)

    // Deduplicate and filter
    const seen = new Set<string>()
    const result: RouteMetadata[] = []

    for (const route of routes) {
      // Skip middleware entries
      if (route.isMiddleware) continue
      // Skip ALL method (middleware-like catch-all)
      if (route.method === 'ALL') continue

      const key = `${route.method} ${route.path}`

      // Skip duplicates
      if (seen.has(key)) continue
      seen.add(key)

      // Apply whitelist filter
      if (!isIncludedRoute(route.method, route.path)) continue

      // Look up metadata
      const meta = ROUTE_METADATA[key]

      if (meta) {
        result.push({
          method: route.method,
          path: route.path,
          description: meta.description,
          authentication: meta.authentication,
          category: meta.category,
          documented: true
        })
      } else {
        // Auto-discovered: infer category and auth
        result.push({
          method: route.method,
          path: route.path,
          description: '',
          authentication: inferAuth(route.path),
          category: inferCategory(route.path),
          documented: false
        })
      }
    }

    // Sort: by category, then method order, then path
    const methodOrder: Record<string, number> = { GET: 0, POST: 1, PUT: 2, PATCH: 3, DELETE: 4 }
    result.sort((a, b) => {
      const catCmp = a.category.localeCompare(b.category)
      if (catCmp !== 0) return catCmp
      const methCmp = (methodOrder[a.method] ?? 5) - (methodOrder[b.method] ?? 5)
      if (methCmp !== 0) return methCmp
      return a.path.localeCompare(b.path)
    })

    cachedRouteList = result
    return result
  } catch (error) {
    console.error('Failed to inspect routes:', error)
    return []
  }
}

// ============================================================================
// OpenAPI Spec Builder
// ============================================================================

export function buildOpenAPISpec(app: any, serverUrl: string): object {
  const routes = buildRouteList(app)

  // Collect unique tags from categories
  const tagSet = new Set<string>()
  for (const r of routes) {
    tagSet.add(r.category)
  }

  const tags = Array.from(tagSet).sort().map(name => {
    const info = CATEGORY_INFO[name]
    return {
      name,
      description: info?.description || ''
    }
  })

  // Build paths
  const paths: Record<string, Record<string, any>> = {}

  for (const route of routes) {
    // Convert :param to {param} for OpenAPI
    const openApiPath = route.path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}')
    const method = route.method.toLowerCase()

    if (!paths[openApiPath]) {
      paths[openApiPath] = {}
    }

    const operation: any = {
      summary: route.description || `${route.method} ${route.path}`,
      tags: [route.category],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        }
      }
    }

    // Add security for authenticated routes
    if (route.authentication === true) {
      operation.security = [{ bearerAuth: [] }]
    }

    // Add path parameters
    const paramMatches = route.path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g)
    if (paramMatches) {
      operation.parameters = paramMatches.map(p => ({
        name: p.slice(1),
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }))
    }

    // Add request body for POST/PUT/PATCH
    if (['post', 'put', 'patch'].includes(method)) {
      operation.requestBody = {
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      }
    }

    paths[openApiPath][method] = operation
  }

  return {
    openapi: '3.0.0',
    info: {
      title: 'SonicJS AI API',
      version: '2.8.0',
      description: 'RESTful API for SonicJS headless CMS - a modern, AI-powered content management system built on Cloudflare Workers. Auto-discovered from registered routes.',
      contact: {
        name: 'SonicJS Support',
        url: `${serverUrl}/docs`,
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
    tags,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  }
}
