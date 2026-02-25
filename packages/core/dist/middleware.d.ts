import * as hono from 'hono';
import { Context, Next, MiddlewareHandler } from 'hono';
import { S as SonicJSConfig } from './app-BO5F5JJy.js';
import '@cloudflare/workers-types';

type Bindings = {
    DB: D1Database;
    KV: KVNamespace;
    JWT_SECRET?: string;
    CORS_ORIGINS?: string;
    ENVIRONMENT?: string;
};
/**
 * Verify security-critical environment configuration at startup.
 * Logs warnings in development, throws in production to prevent
 * insecure deployments from silently running.
 */
declare function verifySecurityConfig(env: Bindings): void;
/**
 * Bootstrap middleware that ensures system initialization
 * Runs once per worker instance
 */
declare function bootstrapMiddleware(config?: SonicJSConfig): (c: Context<{
    Bindings: Bindings;
}>, next: Next) => Promise<void>;

type JWTPayload = {
    userId: string;
    email: string;
    role: string;
    exp: number;
    iat: number;
};
declare class AuthManager {
    static generateToken(userId: string, email: string, role: string, secret?: string): Promise<string>;
    static verifyToken(token: string, secret?: string): Promise<JWTPayload | null>;
    static hashPassword(password: string): Promise<string>;
    static hashPasswordLegacy(password: string): Promise<string>;
    static verifyPassword(password: string, storedHash: string): Promise<boolean>;
    static isLegacyHash(storedHash: string): boolean;
    /**
     * Set authentication cookie - useful for plugins implementing alternative auth methods
     * @param c - Hono context
     * @param token - JWT token to set in cookie
     * @param options - Optional cookie configuration
     */
    static setAuthCookie(c: Context, token: string, options?: {
        maxAge?: number;
        secure?: boolean;
        httpOnly?: boolean;
        sameSite?: 'Strict' | 'Lax' | 'None';
    }): void;
}
declare const requireAuth: () => (c: Context, next: Next) => Promise<void | (Response & hono.TypedResponse<undefined, 302, "redirect">) | (Response & hono.TypedResponse<{
    error: string;
}, 401, "json">)>;
declare const requireRole: (requiredRole: string | string[]) => (c: Context, next: Next) => Promise<void | (Response & hono.TypedResponse<undefined, 302, "redirect">) | (Response & hono.TypedResponse<{
    error: string;
}, 401, "json">) | (Response & hono.TypedResponse<{
    error: string;
}, 403, "json">)>;
declare const optionalAuth: () => (c: Context, next: Next) => Promise<void>;

/**
 * Require a valid API key with a specific scope.
 *
 * When `REQUIRE_API_KEY` env var is NOT set, falls back to
 * optionalApiKey() behavior (allow through, validate if present).
 */
declare const requireApiKey: (scope: string) => (c: Context, next: Next) => Promise<void | (Response & hono.TypedResponse<{
    error: string;
}, 403, "json">) | (Response & hono.TypedResponse<{
    error: string;
}, 401, "json">)>;
/**
 * Optionally validate an API key if the X-API-Key header is present.
 * Does NOT block if no key is provided.
 */
declare const optionalApiKey: () => (c: Context, next: Next) => Promise<void>;

/**
 * Middleware to track all HTTP requests for real-time analytics
 * Excludes the metrics endpoint itself to avoid inflating the count
 */
declare const metricsMiddleware: () => MiddlewareHandler;

interface RateLimitOptions {
    max: number;
    windowMs: number;
    keyPrefix: string;
}
/**
 * KV-based sliding window rate limiter middleware.
 * Gracefully skips if CACHE_KV binding is not available.
 */
declare function rateLimit(options: RateLimitOptions): (c: Context, next: Next) => Promise<void | (Response & hono.TypedResponse<{
    error: string;
}, 429, "json">)>;

/**
 * CSRF Protection Middleware — Signed Double-Submit Cookie
 *
 * Stateless CSRF protection for Cloudflare Workers (no session store needed).
 * Token format: `<nonce>.<hmac>` where HMAC-SHA256 is keyed with JWT_SECRET.
 *
 * Flow:
 *   GET  — ensureCsrfCookie(): reuse existing valid cookie or set a new one
 *   POST/PUT/DELETE/PATCH — validate X-CSRF-Token header === csrf_token cookie, HMAC valid
 *
 * Exempt:
 *   - Safe methods (GET, HEAD, OPTIONS)
 *   - Auth routes that create sessions (/auth/login*, /auth/register*, etc.)
 *   - Public form submissions (/forms/*, /api/forms/*) — NOT /admin/forms/*
 *   - Requests with no auth_token cookie (Bearer-only or API-key-only)
 */

/**
 * Generate a signed CSRF token: `<nonce>.<hmac_signature>`
 * - nonce = 32 random bytes, base64url-encoded
 * - signature = HMAC-SHA256(nonce, secret), base64url-encoded
 */
declare function generateCsrfToken(secret: string): Promise<string>;
/**
 * Validate a signed CSRF token.
 *
 * Checks that the token has the correct `<nonce>.<signature>` format and that
 * the HMAC signature is valid for the given secret. Uses crypto.subtle.verify
 * which provides constant-time comparison.
 *
 * NOTE: No expiry check here — by design. The security property of signed
 * double-submit comes from the unpredictability of the nonce + the
 * secret-bound HMAC, not from time-bounding. The cookie's maxAge (86400s)
 * handles expiry at the browser level.
 */
declare function validateCsrfToken(token: string, secret: string): Promise<boolean>;
interface CsrfOptions {
    /** Additional paths to exempt from CSRF validation. */
    exemptPaths?: string[];
}
/**
 * CSRF protection middleware (Signed Double-Submit Cookie).
 *
 * - GET/HEAD/OPTIONS: ensure a valid csrf_token cookie exists
 * - POST/PUT/DELETE/PATCH: validate X-CSRF-Token header matches cookie, HMAC valid
 * - Exempt: auth routes, public /forms/*, Bearer-only, API-key-only
 */
declare function csrfProtection(options?: CsrfOptions): (c: Context, next: Next) => Promise<Response | void>;

declare function setRequestLoggingEnabled(enabled: boolean): void;
declare function setSecurityLoggingEnabled(enabled: boolean): void;
/**
 * Global HTTP request logger.
 *
 * Always sets requestId and startTime on context (used by other middleware for
 * correlation). The actual D1 write is gated by `requestLoggingEnabled` which
 * defaults to false — enable via `setRequestLoggingEnabled(true)`.
 */
declare function loggingMiddleware(): (c: Context, next: Next) => Promise<void>;
/**
 * Security response logger — logs 401/403 responses as security events.
 *
 * Always mounted in the middleware chain but conditionally writes. Gated by
 * `securityResponseLoggingEnabled` which defaults to false — enable via
 * `setSecurityLoggingEnabled(true)`. This is separate from the `security`
 * category in log_config (which stays enabled for CSRF/rate-limit events).
 */
declare function securityLoggingMiddleware(): (c: Context, next: Next) => Promise<void>;
/**
 * Performance logger — logs requests that exceed a duration threshold.
 */
declare function performanceLoggingMiddleware(thresholdMs?: number): (c: Context, next: Next) => Promise<void>;
/**
 * Detailed request/response header logger (debug level).
 */
declare function detailedLoggingMiddleware(): (c: Context, next: Next) => Promise<void>;

/**
 * Security headers middleware.
 * Sets standard security headers on every response.
 * Skips HSTS in development to avoid local dev issues.
 */
declare const securityHeadersMiddleware: () => (c: Context, next: Next) => Promise<void>;

/**
 * Middleware Module Exports
 *
 * Request processing middleware for SonicJS
 *
 * Note: Most middleware is currently in the monolith and will be migrated later.
 * For now, we only export the bootstrap middleware which is used for system initialization.
 */

type Permission = string;
type UserPermissions = {
    userId: string;
    permissions: Permission[];
};

declare const cacheHeaders: any;
declare const compressionMiddleware: any;

declare const PermissionManager: any;
declare const requirePermission: any;
declare const requireAnyPermission: any;
declare const requireActivePlugin: any;
declare const requireActivePlugins: any;
declare const getActivePlugins: any;
declare const isPluginActive: any;

declare function logActivity(db: D1Database, userId: string, action: string, resourceType?: string, resourceId?: string, details?: any, ipAddress?: string, userAgent?: string): Promise<void>;
declare function logActivityFromContext(c: Context, action: string, resourceType?: string, resourceId?: string, details?: any): Promise<void>;

export { AuthManager, type Permission, PermissionManager, type UserPermissions, bootstrapMiddleware, cacheHeaders, compressionMiddleware, csrfProtection, detailedLoggingMiddleware, generateCsrfToken, getActivePlugins, isPluginActive, logActivity, logActivityFromContext, loggingMiddleware, metricsMiddleware, optionalApiKey, optionalAuth, performanceLoggingMiddleware, rateLimit, requireActivePlugin, requireActivePlugins, requireAnyPermission, requireApiKey, requireAuth, requirePermission, requireRole, securityHeadersMiddleware as securityHeaders, securityLoggingMiddleware, setRequestLoggingEnabled, setSecurityLoggingEnabled, validateCsrfToken, verifySecurityConfig };
