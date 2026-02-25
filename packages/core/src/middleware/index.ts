/**
 * Middleware Module Exports
 *
 * Request processing middleware for SonicJS
 *
 * Note: Most middleware is currently in the monolith and will be migrated later.
 * For now, we only export the bootstrap middleware which is used for system initialization.
 */

// Bootstrap middleware
export { bootstrapMiddleware, verifySecurityConfig } from './bootstrap'

// Auth middleware
export { AuthManager, requireAuth, requireRole, optionalAuth } from './auth'

// API key middleware
export { requireApiKey, optionalApiKey } from './api-key'

// Metrics middleware
export { metricsMiddleware } from './metrics'

// Rate limiting middleware
export { rateLimit } from './rate-limit'

// CSRF protection middleware
export { csrfProtection, generateCsrfToken, validateCsrfToken } from './csrf'

// Re-export types and functions that are referenced but implemented in monolith
// These are placeholder exports to maintain API compatibility
export type Permission = string
export type UserPermissions = {
  userId: string
  permissions: Permission[]
}

// Middleware stubs - these return pass-through middleware that call next()
export const loggingMiddleware: any = () => async (_c: any, next: any) => await next()
export const detailedLoggingMiddleware: any = () => async (_c: any, next: any) => await next()
export const securityLoggingMiddleware: any = () => async (_c: any, next: any) => await next()
export const performanceLoggingMiddleware: any = () => async (_c: any, next: any) => await next()
export const cacheHeaders: any = () => async (_c: any, next: any) => await next()
export const compressionMiddleware: any = async (_c: any, next: any) => await next()
export { securityHeadersMiddleware as securityHeaders } from './security-headers'

// Other stubs
export const PermissionManager: any = {}
export const requirePermission: any = () => async (_c: any, next: any) => await next()
export const requireAnyPermission: any = () => async (_c: any, next: any) => await next()
export const requireActivePlugin: any = () => async (_c: any, next: any) => await next()
export const requireActivePlugins: any = () => async (_c: any, next: any) => await next()
export const getActivePlugins: any = () => []
export const isPluginActive: any = () => false

// Activity logging — writes to activity_logs table
import type { Context } from 'hono'

export async function logActivity(
  db: D1Database,
  userId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    if (!db) return
    await db
      .prepare(
        `INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        userId,
        action,
        resourceType || null,
        resourceId || null,
        details ? JSON.stringify(details) : null,
        ipAddress || null,
        userAgent || null,
        Date.now()
      )
      .run()
  } catch (e) {
    console.error('[logActivity] Failed to write activity log:', e)
  }
}

export async function logActivityFromContext(
  c: Context,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: any
): Promise<void> {
  const user = c.get('user') as any
  const db = c.env?.DB as D1Database | undefined
  const ip =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for') ||
    'unknown'
  const ua = c.req.header('user-agent') || ''
  return logActivity(
    db as any,
    user?.userId || user?.id || 'unknown',
    action,
    resourceType,
    resourceId,
    details,
    ip,
    ua
  )
}
