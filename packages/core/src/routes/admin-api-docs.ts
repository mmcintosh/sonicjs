/**
 * Admin API Docs Routes
 *
 * Provides an interactive API documentation page using Scalar,
 * powered by the auto-generated OpenAPI specification.
 */

import { Hono } from 'hono'
import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types'
import { requireAuth } from '../middleware'
import {
  renderAPIDocsPage,
  type APIDocsPageData
} from '../templates/pages/admin-api-docs.template'
import { getCoreVersion } from '../utils/version'

const VERSION = getCoreVersion()

type Bindings = {
  DB: D1Database
  CACHE_KV: KVNamespace
  MEDIA_BUCKET: R2Bucket
}

type Variables = {
  user?: {
    userId: string
    email: string
    role: string
  }
}

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Apply authentication middleware
router.use('*', requireAuth())

/**
 * GET /admin/api-docs - Interactive API Documentation
 *
 * Embeds Scalar API reference viewer powered by the auto-generated
 * OpenAPI spec served at GET /api.
 */
router.get('/', async (c) => {
  const user = c.get('user')

  const pageData: APIDocsPageData = {
    user: user ? {
      name: user.email.split('@')[0] || user.email,
      email: user.email,
      role: user.role
    } : undefined,
    version: VERSION
  }

  return c.html(renderAPIDocsPage(pageData))
})

export { router as adminApiDocsRoutes }
