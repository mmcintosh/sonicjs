/**
 * Output Escaping Tests
 *
 * Verifies that user-supplied data is HTML-escaped when rendered in templates
 * to prevent stored XSS. Tests cover admin-content, auth, and public-forms routes.
 */

import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'

// ============================================================================
// Mock heavy dependencies before importing routes
// ============================================================================

// Mock requireAuth — pass through without checking
vi.mock('../../middleware', async () => {
  return {
    requireAuth: vi.fn(() => async (c: any, next: any) => {
      c.set('user', { id: 'test-user', email: 'admin@test.com', role: 'admin' })
      await next()
    }),
    AuthManager: {
      hashPassword: vi.fn().mockResolvedValue('hashed'),
      generateToken: vi.fn().mockResolvedValue('mock-token'),
      verifyPassword: vi.fn().mockResolvedValue(true),
      isLegacyHash: vi.fn().mockReturnValue(false),
    },
    rateLimit: vi.fn(() => async (_c: any, next: any) => next()),
    generateCsrfToken: vi.fn().mockResolvedValue('mock-csrf-token'),
  }
})

// Mock plugin middleware
vi.mock('../../middleware/plugin-middleware', () => ({
  isPluginActive: vi.fn().mockResolvedValue(false),
}))

// Mock templates
vi.mock('../../templates/pages/admin-content-form.template', () => ({
  renderContentFormPage: vi.fn(() => '<html>form page</html>'),
  ContentFormData: {},
}))
vi.mock('../../templates/pages/admin-content-list.template', () => ({
  renderContentListPage: vi.fn(() => '<html>list page</html>'),
  ContentListPageData: {},
}))
vi.mock('../../templates/components/version-history.template', () => ({
  renderVersionHistory: vi.fn(() => '<html>history</html>'),
  VersionHistoryData: {},
  ContentVersion: {},
}))
vi.mock('../../templates/pages/auth-login.template', () => ({
  renderLoginPage: vi.fn(() => '<html>login page</html>'),
  LoginPageData: {},
}))
vi.mock('../../templates/pages/auth-register.template', () => ({
  renderRegisterPage: vi.fn(() => '<html>register page</html>'),
  RegisterPageData: {},
}))

// Mock services
vi.mock('../../services/cache', () => ({
  getCacheService: vi.fn(() => ({
    generateKey: vi.fn((_p: string, k: string) => `${_p}:${k}`),
    getOrSet: vi.fn(async (_key: string, fn: () => Promise<any>) => fn()),
    getWithSource: vi.fn().mockResolvedValue({ hit: false, data: null }),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
    delete: vi.fn(),
    invalidate: vi.fn(),
  })),
  CACHE_CONFIGS: {
    content: { ttl: 300, keyPrefix: 'content' },
    collection: { ttl: 600, keyPrefix: 'collection' },
    user: { ttl: 600, keyPrefix: 'user' },
  },
}))
vi.mock('../../services/plugin-service', () => ({
  PluginService: class { static isPluginActive() { return false }; getPlugin() { return null } },
}))
vi.mock('../../services/auth-validation', () => ({
  authValidationService: {
    buildRegistrationSchema: vi.fn().mockResolvedValue(null),
    generateDefaultValue: vi.fn().mockReturnValue(''),
  },
  isRegistrationEnabled: vi.fn().mockResolvedValue(false),
  isFirstUserRegistration: vi.fn().mockResolvedValue(false),
}))
vi.mock('../../utils/blocks', () => ({
  getBlocksFieldConfig: vi.fn(() => null),
  parseBlocksValue: vi.fn((v: any) => v),
}))
vi.mock('../../plugins/core-plugins/ai-search-plugin/services/fts5.service', () => ({
  FTS5Service: class { syncContent() {} deleteContent() {} },
}))
vi.mock('../../plugins/core-plugins/ai-search-plugin/services/search-cache.service', () => ({
  SearchCacheService: class { invalidateForContent() {} },
}))

// Mock turnstile
vi.mock('../../plugins/core-plugins/turnstile-plugin/services/turnstile', () => ({
  TurnstileService: class {
    isConfigured() { return false }
    isEnabled() { return false }
    verify() { return { success: true } }
  },
}))
vi.mock('../../services/form-collection-sync', () => ({
  createContentFromSubmission: vi.fn(),
}))

// Now import routes (after all mocks)
import adminContentRoutes from '../../routes/admin-content'
import publicFormsRoutes from '../../routes/public-forms'
import authRoutes from '../../routes/auth'

// ============================================================================
// Helpers
// ============================================================================

const XSS_DISPLAY_NAME = '<script>alert("XSS")</script>'
const ESCAPED_DISPLAY_NAME = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'

const XSS_DESCRIPTION = '"><img src=x onerror=alert(1)>'
const ESCAPED_DESCRIPTION = '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;'

// ============================================================================
// Tests
// ============================================================================

describe('Output Escaping — Admin Content Routes', () => {
  it('should escape collection display_name and description in selection page', async () => {
    const collections = [
      { id: 'col-1', name: 'test', display_name: XSS_DISPLAY_NAME, description: XSS_DESCRIPTION },
    ]

    const mockDB = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: collections }),
        run: vi.fn(),
      }),
    }

    const app = new Hono()
    app.use('*', async (c, next) => {
      // @ts-ignore
      c.env = { DB: mockDB, CACHE_KV: {} }
      c.set('user', { id: 'u1', email: 'admin@test.com', role: 'admin' })
      c.set('appVersion', '1.0.0')
      await next()
    })
    app.route('/admin/content', adminContentRoutes)

    const res = await app.request('/admin/content/new')
    expect(res.status).toBe(200)

    const html = await res.text()
    // Should contain escaped versions, NOT raw XSS
    expect(html).toContain(ESCAPED_DISPLAY_NAME)
    expect(html).toContain(ESCAPED_DESCRIPTION)
    // Raw <script> tag must not appear as actual HTML
    expect(html).not.toContain(XSS_DISPLAY_NAME)
    // Raw <img> tag must not appear as actual HTML
    expect(html).not.toContain('<img src=x')
  })

  it('should escape title and fields in content preview', async () => {
    const XSS_TITLE = '<img src=x onerror=alert("title")>'

    const mockCollection = {
      id: 'col-1', name: 'test', display_name: XSS_DISPLAY_NAME, description: 'desc',
      schema: JSON.stringify({ fields: [] }),
    }

    const mockFields = [
      { field_name: 'title', field_label: '<b>Title</b>', field_type: 'text', sort_order: 0, field_options: null, is_required: 0, is_searchable: 0 },
    ]

    const mockDB = {
      prepare: vi.fn().mockImplementation(() => ({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockCollection),
        all: vi.fn().mockResolvedValue({ results: mockFields }),
      })),
    }

    const app = new Hono()
    app.use('*', async (c, next) => {
      // @ts-ignore
      c.env = { DB: mockDB, CACHE_KV: {} }
      c.set('user', { id: 'u1', email: 'admin@test.com', role: 'admin' })
      c.set('appVersion', '1.0.0')
      await next()
    })
    app.route('/admin/content', adminContentRoutes)

    const formData = new FormData()
    formData.set('collection_id', 'col-1')
    formData.set('status', 'published')
    formData.set('title', XSS_TITLE)

    const res = await app.request('/admin/content/preview', {
      method: 'POST',
      body: formData,
    })
    expect(res.status).toBe(200)

    const html = await res.text()
    // Title should be escaped — raw <img> tag must not appear
    expect(html).toContain('&lt;img src=x onerror=alert(&quot;title&quot;)&gt;')
    expect(html).not.toContain('<img src=x')
    // Field label should be escaped
    expect(html).toContain('&lt;b&gt;Title&lt;/b&gt;')
    // Collection display_name should be escaped
    expect(html).toContain(ESCAPED_DISPLAY_NAME)
  })
})

describe('Output Escaping — Public Forms Routes', () => {
  it('should escape form display_name and description', async () => {
    const mockForm = {
      id: 'form-1',
      name: 'test-form',
      display_name: XSS_DISPLAY_NAME,
      description: XSS_DESCRIPTION,
      is_active: 1,
      is_public: 1,
      formio_schema: JSON.stringify({ components: [] }),
      settings: JSON.stringify({}),
    }

    const mockDB = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockForm),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    }

    const app = new Hono()
    app.use('*', async (c, next) => {
      // @ts-ignore
      c.env = { DB: mockDB, GOOGLE_MAPS_API_KEY: '' }
      await next()
    })
    app.route('/forms', publicFormsRoutes)

    const res = await app.request('/forms/test-form')
    expect(res.status).toBe(200)

    const html = await res.text()
    // Title and description should be escaped
    expect(html).toContain(ESCAPED_DISPLAY_NAME)
    expect(html).toContain(ESCAPED_DESCRIPTION)
    // Raw <img> tag must not appear as actual HTML
    expect(html).not.toContain('<img src=x')
    // Raw <script> tag must not appear
    expect(html).not.toContain(XSS_DISPLAY_NAME)
  })
})

describe('Output Escaping — Auth Routes', () => {
  it('should escape user data in accept-invitation page', async () => {
    const XSS_NAME = '<script>alert("name")</script>'
    const ESCAPED_NAME = '&lt;script&gt;alert(&quot;name&quot;)&lt;/script&gt;'

    const mockUser = {
      id: 'u-1',
      email: 'invited@test.com',
      first_name: XSS_NAME,
      last_name: XSS_NAME,
      role: 'editor',
      status: 'invited',
      is_active: 0,
      invitation_token: 'valid-token',
      invited_at: Date.now() - 1000, // invited 1 second ago (not expired)
    }

    const mockDB = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockUser),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    }

    const app = new Hono()
    app.use('*', async (c, next) => {
      // @ts-ignore
      c.env = { DB: mockDB, CACHE_KV: {}, JWT_SECRET: 'test-secret' }
      await next()
    })
    app.route('/auth', authRoutes)

    const res = await app.request('/auth/accept-invitation?token=valid-token')
    expect(res.status).toBe(200)

    const html = await res.text()
    expect(html).toContain(ESCAPED_NAME)
    expect(html).not.toContain(XSS_NAME)
  })

  it('should escape user data in reset-password page', async () => {
    const XSS_EMAIL = '"><script>alert("email")</script>'
    const ESCAPED_EMAIL = '&quot;&gt;&lt;script&gt;alert(&quot;email&quot;)&lt;/script&gt;'

    const mockUser = {
      id: 'u-1',
      email: XSS_EMAIL,
      first_name: 'Test',
      last_name: 'User',
      role: 'admin',
      is_active: 1,
      password_reset_token: 'valid-reset-token',
      password_reset_expires: Date.now() + 3600000, // 1 hour from now
    }

    const mockDB = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockUser),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    }

    const app = new Hono()
    app.use('*', async (c, next) => {
      // @ts-ignore
      c.env = { DB: mockDB, CACHE_KV: {}, JWT_SECRET: 'test-secret' }
      await next()
    })
    app.route('/auth', authRoutes)

    const res = await app.request('/auth/reset-password?token=valid-reset-token')
    expect(res.status).toBe(200)

    const html = await res.text()
    expect(html).toContain(ESCAPED_EMAIL)
    // Raw <script> tag must not appear
    expect(html).not.toContain('<script>alert("email")</script>')
  })
})
