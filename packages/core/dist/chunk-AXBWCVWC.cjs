'use strict';

var chunkMPT5PA6U_cjs = require('./chunk-MPT5PA6U.cjs');
var chunkTSF47PIE_cjs = require('./chunk-TSF47PIE.cjs');
var chunkRCQ2HIQD_cjs = require('./chunk-RCQ2HIQD.cjs');
var jwt = require('hono/jwt');
var cookie = require('hono/cookie');

// src/middleware/bootstrap.ts
var bootstrapComplete = false;
function bootstrapMiddleware(config = {}) {
  return async (c, next) => {
    if (bootstrapComplete) {
      return next();
    }
    const path = c.req.path;
    if (path.startsWith("/images/") || path.startsWith("/assets/") || path === "/health" || path.endsWith(".js") || path.endsWith(".css") || path.endsWith(".png") || path.endsWith(".jpg") || path.endsWith(".ico")) {
      return next();
    }
    try {
      console.log("[Bootstrap] Starting system initialization...");
      console.log("[Bootstrap] Running database migrations...");
      const migrationService = new chunkTSF47PIE_cjs.MigrationService(c.env.DB);
      await migrationService.runPendingMigrations();
      console.log("[Bootstrap] Syncing collection configurations...");
      try {
        await chunkMPT5PA6U_cjs.syncCollections(c.env.DB);
      } catch (error) {
        console.error("[Bootstrap] Error syncing collections:", error);
      }
      if (!config.plugins?.disableAll) {
        console.log("[Bootstrap] Bootstrapping core plugins...");
        const bootstrapService = new chunkMPT5PA6U_cjs.PluginBootstrapService(c.env.DB);
        const needsBootstrap = await bootstrapService.isBootstrapNeeded();
        if (needsBootstrap) {
          await bootstrapService.bootstrapCorePlugins();
        }
      } else {
        console.log("[Bootstrap] Plugin bootstrap skipped (disableAll is true)");
      }
      bootstrapComplete = true;
      console.log("[Bootstrap] System initialization completed");
    } catch (error) {
      console.error("[Bootstrap] Error during system initialization:", error);
    }
    return next();
  };
}
var JWT_SECRET_FALLBACK = "your-super-secret-jwt-key-change-in-production";
var AuthManager = class {
  static async generateToken(userId, email, role, secret) {
    const payload = {
      userId,
      email,
      role,
      exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 24,
      // 24 hours
      iat: Math.floor(Date.now() / 1e3)
    };
    return await jwt.sign(payload, secret || JWT_SECRET_FALLBACK, "HS256");
  }
  static async verifyToken(token, secret) {
    try {
      const payload = await jwt.verify(token, secret || JWT_SECRET_FALLBACK, "HS256");
      if (payload.exp < Math.floor(Date.now() / 1e3)) {
        return null;
      }
      return payload;
    } catch (error) {
      console.error("Token verification failed:", error);
      return null;
    }
  }
  static async hashPassword(password) {
    const iterations = 1e5;
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );
    const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return `pbkdf2:${iterations}:${saltHex}:${hashHex}`;
  }
  static async hashPasswordLegacy(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "salt-change-in-production");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  static async verifyPassword(password, storedHash) {
    if (storedHash.startsWith("pbkdf2:")) {
      const parts = storedHash.split(":");
      if (parts.length !== 4) return false;
      const iterationsStr = parts[1];
      const saltHex = parts[2];
      const expectedHashHex = parts[3];
      const iterations = parseInt(iterationsStr, 10);
      const saltBytes = saltHex.match(/.{2}/g);
      if (!saltBytes) return false;
      const salt = new Uint8Array(saltBytes.map((byte) => parseInt(byte, 16)));
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
      );
      const hashBuffer = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt,
          iterations,
          hash: "SHA-256"
        },
        keyMaterial,
        256
      );
      const actualHashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
      if (actualHashHex.length !== expectedHashHex.length) return false;
      let result2 = 0;
      for (let i = 0; i < actualHashHex.length; i++) {
        result2 |= actualHashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
      }
      return result2 === 0;
    }
    const legacyHash = await this.hashPasswordLegacy(password);
    if (legacyHash.length !== storedHash.length) return false;
    let result = 0;
    for (let i = 0; i < legacyHash.length; i++) {
      result |= legacyHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    return result === 0;
  }
  static isLegacyHash(storedHash) {
    return !storedHash.startsWith("pbkdf2:");
  }
  /**
   * Set authentication cookie - useful for plugins implementing alternative auth methods
   * @param c - Hono context
   * @param token - JWT token to set in cookie
   * @param options - Optional cookie configuration
   */
  static setAuthCookie(c, token, options) {
    cookie.setCookie(c, "auth_token", token, {
      httpOnly: options?.httpOnly ?? true,
      secure: options?.secure ?? true,
      sameSite: options?.sameSite ?? "Strict",
      maxAge: options?.maxAge ?? 60 * 60 * 24
      // 24 hours default
    });
  }
};
var requireAuth = () => {
  return async (c, next) => {
    try {
      let token = c.req.header("Authorization")?.replace("Bearer ", "");
      if (!token) {
        token = cookie.getCookie(c, "auth_token");
      }
      if (!token) {
        const acceptHeader = c.req.header("Accept") || "";
        if (acceptHeader.includes("text/html")) {
          return c.redirect("/auth/login?error=Please login to access the admin area");
        }
        return c.json({ error: "Authentication required" }, 401);
      }
      const kv = c.env?.KV;
      let payload = null;
      if (kv) {
        const cacheKey = `auth:${token.substring(0, 20)}`;
        const cached = await kv.get(cacheKey, "json");
        if (cached) {
          payload = cached;
        }
      }
      if (!payload) {
        const jwtSecret = c.env?.JWT_SECRET;
        payload = await AuthManager.verifyToken(token, jwtSecret);
        if (payload && kv) {
          const cacheKey = `auth:${token.substring(0, 20)}`;
          await kv.put(cacheKey, JSON.stringify(payload), { expirationTtl: 300 });
        }
      }
      if (!payload) {
        const acceptHeader = c.req.header("Accept") || "";
        if (acceptHeader.includes("text/html")) {
          return c.redirect("/auth/login?error=Your session has expired, please login again");
        }
        return c.json({ error: "Invalid or expired token" }, 401);
      }
      c.set("user", payload);
      return await next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      const acceptHeader = c.req.header("Accept") || "";
      if (acceptHeader.includes("text/html")) {
        return c.redirect("/auth/login?error=Authentication failed, please login again");
      }
      return c.json({ error: "Authentication failed" }, 401);
    }
  };
};
var requireRole = (requiredRole) => {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) {
      const acceptHeader = c.req.header("Accept") || "";
      if (acceptHeader.includes("text/html")) {
        return c.redirect("/auth/login?error=Please login to access the admin area");
      }
      return c.json({ error: "Authentication required" }, 401);
    }
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      const acceptHeader = c.req.header("Accept") || "";
      if (acceptHeader.includes("text/html")) {
        return c.redirect("/auth/login?error=You do not have permission to access this area");
      }
      return c.json({ error: "Insufficient permissions" }, 403);
    }
    return await next();
  };
};
var optionalAuth = () => {
  return async (c, next) => {
    try {
      let token = c.req.header("Authorization")?.replace("Bearer ", "");
      if (!token) {
        token = cookie.getCookie(c, "auth_token");
      }
      if (token) {
        const jwtSecret = c.env?.JWT_SECRET;
        const payload = await AuthManager.verifyToken(token, jwtSecret);
        if (payload) {
          c.set("user", payload);
        }
      }
      return await next();
    } catch (error) {
      console.error("Optional auth error:", error);
      return await next();
    }
  };
};

// src/middleware/api-key.ts
var VALID_SCOPES = ["search:read", "search:write", "search:analytics"];
async function hashApiKey(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function resolveApiKey(c) {
  const header = c.req.header("X-API-Key");
  if (!header) return null;
  const hash = await hashApiKey(header);
  const kv = c.env.CACHE_KV;
  if (kv) {
    try {
      const cached = await kv.get(`apikey:${hash}`, "json");
      if (cached) return cached;
    } catch {
    }
  }
  const db = c.env.DB;
  if (!db) return null;
  let row = null;
  try {
    row = await db.prepare("SELECT id, name, user_id, permissions, expires_at, last_used_at FROM api_tokens WHERE token = ? LIMIT 1").bind(hash).first();
  } catch {
    return null;
  }
  if (!row) return null;
  if (row.expires_at) {
    const expiresMs = typeof row.expires_at === "string" ? new Date(row.expires_at).getTime() : Number(row.expires_at);
    if (expiresMs < Date.now()) return null;
  }
  let scopes = [];
  try {
    scopes = JSON.parse(row.permissions);
    if (!Array.isArray(scopes)) scopes = [];
  } catch {
    scopes = [];
  }
  const apiKey = {
    id: row.id,
    name: row.name,
    scopes,
    userId: row.user_id
  };
  if (kv) {
    try {
      await kv.put(`apikey:${hash}`, JSON.stringify(apiKey), { expirationTtl: 300 });
    } catch {
    }
  }
  try {
    const ctx = c.executionCtx;
    if (ctx?.waitUntil) {
      ctx.waitUntil(
        db.prepare("UPDATE api_tokens SET last_used_at = ? WHERE id = ?").bind(Date.now(), row.id).run()
      );
    }
  } catch {
  }
  return apiKey;
}
var requireApiKey = (scope) => {
  return async (c, next) => {
    const enforce = c.env.REQUIRE_API_KEY === "true";
    const apiKey = await resolveApiKey(c);
    if (apiKey) {
      c.set("apiKey", apiKey);
      if (!apiKey.scopes.includes(scope)) {
        return c.json({ error: `Insufficient scope. Required: ${scope}` }, 403);
      }
      return next();
    }
    if (enforce) {
      return c.json({ error: "API key required. Pass X-API-Key header." }, 401);
    }
    return next();
  };
};
var optionalApiKey = () => {
  return async (c, next) => {
    try {
      const apiKey = await resolveApiKey(c);
      if (apiKey) {
        c.set("apiKey", apiKey);
      }
    } catch {
    }
    return next();
  };
};

// src/middleware/metrics.ts
var metricsMiddleware = () => {
  return async (c, next) => {
    const path = new URL(c.req.url).pathname;
    if (path !== "/admin/dashboard/api/metrics") {
      chunkRCQ2HIQD_cjs.metricsTracker.recordRequest();
    }
    await next();
  };
};

// src/middleware/rate-limit.ts
function rateLimit(options) {
  const { max, windowMs, keyPrefix } = options;
  return async (c, next) => {
    const kv = c.env?.CACHE_KV;
    if (!kv) {
      return await next();
    }
    const ip = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown";
    const key = `ratelimit:${keyPrefix}:${ip}`;
    try {
      const now = Date.now();
      const stored = await kv.get(key, "json");
      let entry;
      if (stored && stored.resetAt > now) {
        entry = stored;
      } else {
        entry = { count: 0, resetAt: now + windowMs };
      }
      entry.count++;
      const ttlSeconds = Math.ceil((entry.resetAt - now) / 1e3);
      if (entry.count > max) {
        await kv.put(key, JSON.stringify(entry), { expirationTtl: Math.max(ttlSeconds, 1) });
        const retryAfter = Math.ceil((entry.resetAt - now) / 1e3);
        c.header("Retry-After", String(retryAfter));
        c.header("X-RateLimit-Limit", String(max));
        c.header("X-RateLimit-Remaining", "0");
        c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1e3)));
        return c.json({ error: "Too many requests. Please try again later." }, 429);
      }
      await kv.put(key, JSON.stringify(entry), { expirationTtl: Math.max(ttlSeconds, 1) });
      c.header("X-RateLimit-Limit", String(max));
      c.header("X-RateLimit-Remaining", String(max - entry.count));
      c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1e3)));
      return await next();
    } catch (error) {
      console.error("Rate limiter error (non-fatal):", error);
      return await next();
    }
  };
}

// src/middleware/index.ts
var loggingMiddleware = () => async (_c, next) => await next();
var detailedLoggingMiddleware = () => async (_c, next) => await next();
var securityLoggingMiddleware = () => async (_c, next) => await next();
var performanceLoggingMiddleware = () => async (_c, next) => await next();
var cacheHeaders = () => async (_c, next) => await next();
var compressionMiddleware = async (_c, next) => await next();
var securityHeaders = () => async (_c, next) => await next();
var PermissionManager = {};
var requirePermission = () => async (_c, next) => await next();
var requireAnyPermission = () => async (_c, next) => await next();
var logActivity = () => {
};
var requireActivePlugin = () => async (_c, next) => await next();
var requireActivePlugins = () => async (_c, next) => await next();
var getActivePlugins = () => [];
var isPluginActive = () => false;

exports.AuthManager = AuthManager;
exports.PermissionManager = PermissionManager;
exports.VALID_SCOPES = VALID_SCOPES;
exports.bootstrapMiddleware = bootstrapMiddleware;
exports.cacheHeaders = cacheHeaders;
exports.compressionMiddleware = compressionMiddleware;
exports.detailedLoggingMiddleware = detailedLoggingMiddleware;
exports.getActivePlugins = getActivePlugins;
exports.hashApiKey = hashApiKey;
exports.isPluginActive = isPluginActive;
exports.logActivity = logActivity;
exports.loggingMiddleware = loggingMiddleware;
exports.metricsMiddleware = metricsMiddleware;
exports.optionalApiKey = optionalApiKey;
exports.optionalAuth = optionalAuth;
exports.performanceLoggingMiddleware = performanceLoggingMiddleware;
exports.rateLimit = rateLimit;
exports.requireActivePlugin = requireActivePlugin;
exports.requireActivePlugins = requireActivePlugins;
exports.requireAnyPermission = requireAnyPermission;
exports.requireApiKey = requireApiKey;
exports.requireAuth = requireAuth;
exports.requirePermission = requirePermission;
exports.requireRole = requireRole;
exports.securityHeaders = securityHeaders;
exports.securityLoggingMiddleware = securityLoggingMiddleware;
//# sourceMappingURL=chunk-AXBWCVWC.cjs.map
//# sourceMappingURL=chunk-AXBWCVWC.cjs.map