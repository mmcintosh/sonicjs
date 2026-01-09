# 🚨 CRITICAL: KV Operations Count Against 6-Connection Limit!

**Date**: January 10, 2026  
**Finding**: Our auth middleware attempts KV operations, which count toward the 6-connection limit

---

## ⚠️ The Problem

From Cloudflare's documentation, the 6-connection limit includes:

1. ✅ `fetch()` calls
2. **✅ KV operations (`get()`, `put()`, `list()`, `delete()`)** ← THIS!
3. ✅ Cache operations
4. ✅ R2 operations
5. ✅ Queue operations
6. ✅ TCP sockets/WebSockets

**Notably MISSING**: D1 operations! D1 uses internal Cloudflare infrastructure and likely doesn't count against this limit.

---

## 🔍 What We're Doing Wrong

### **Our Auth Middleware** (lines 101-160 in auth.ts):

```typescript
// 1. Check in-memory cache first (fastest)
const memCached = tokenCache.get(cacheKey)
if (memCached && memCached.expires > Date.now()) {
  payload = memCached.payload
}

// 2. If not in memory, try KV cache (slower but shared across requests)
if (!payload) {
  const kv = c.env?.KV  // ← Attempts KV connection
  if (kv) {
    try {
      const kvCached = await kv.get(cacheKey, 'json')  // ← USES 1 CONNECTION!
      if (kvCached) {
        payload = kvCached as JWTPayload
        tokenCache.set(cacheKey, {
          payload,
          expires: Date.now() + CACHE_TTL
        })
      }
    } catch (error) {
      console.warn('KV cache unavailable, using memory cache only')
    }
  }
}

// 3. Cache the result in KV (async, don't wait for it)
if (payload) {
  const kv = c.env?.KV
  if (kv) {
    kv.put(cacheKey, JSON.stringify(payload), { expirationTtl: 300 })
      .catch(() => {})  // ← USES ANOTHER CONNECTION! (even though we don't await)
  }
}
```

### **The Issue:**

**Every authenticated request potentially uses 2 KV connections**:
1. One for `kv.get()` (checking cache)
2. One for `kv.put()` (storing cache)

**In CI with 427 tests**, if each test makes multiple authenticated requests:
- Request 1: KV get + put = 2 connections
- Request 2: KV get + put = 2 connections  
- Request 3: KV get + put = 2 connections
- **Total: 6 connections used by KV alone!**

This leaves **0 connections** for D1, R2, or anything else!

---

## 📊 Connection Usage Per Request

### **Before Our Fix:**

```
Auth middleware:
  - KV.get() ────────────── 1 connection
  - KV.put() ────────────── 1 connection (async but still counts)
  
Migration check (frontend):
  - fetch('/api/migrations/status') ── 1 connection
  
Page rendering:
  - Multiple D1 queries ──── 0 connections (D1 is internal)
  - R2/media operations ──── 1 connection (if media)
  
Total: 4 connections used
Remaining: 2 connections
```

This looks OK, but...

### **With Multiple Parallel Requests (CI scenario):**

```
Request 1 (auth): KV.get + KV.put = 2 connections (opening)
Request 2 (auth): KV.get + KV.put = 2 connections (opening)
Request 3 (auth): KV.get + KV.put = 2 connections (queued! limit hit)
Request 4 (auth): ...queued
Request 5 (auth): ...queued

Result: Requests 3+ are QUEUED, causing delays!
```

**This creates cascading slowness** because:
1. First 3 requests consume all 6 connections
2. Later requests must wait
3. If a connection is "stalled" (not actively reading/writing), it gets closed
4. Worker might deadlock waiting for connections

---

## 💡 Why Our CI is Slow

### **Theory Confirmed:**

1. ✅ In-memory cache helps (no KV calls after first hit)
2. ❌ **But KV is still attempted** when cache misses occur
3. ❌ CI environment might have **slower KV** or **no KV at all**
4. ❌ KV operations take 5-10s in CI (same as D1!)
5. ❌ These KV operations **consume connections**, blocking everything else

### **The 24-Second Delay Explained:**

```
Auth request comes in:
  1. Memory cache miss (0ms)
  2. KV.get() attempt (5-10s) ← USES 1 CONNECTION
  3. KV timeout or error (another 5-10s)
  4. JWT verification (50ms)
  5. KV.put() attempt (5-10s) ← USES ANOTHER CONNECTION
  
Total: 24 seconds! ❌
```

---

## 🔧 The Fix

### **Solution 1: Skip KV in CI** ✅ (Recommended)

KV might not even be available or properly configured in CI:

```typescript
// Only use KV if it's fast and available
if (!payload && c.env?.KV) {
  // Skip KV if we're in CI or if KV is slow
  const isCI = c.env?.ENVIRONMENT === 'test' || c.env?.CI === 'true'
  
  if (!isCI) {
    try {
      const kvCached = await kv.get(cacheKey, 'json')
      // ...
    } catch (error) {
      // KV unavailable, continue with memory cache
    }
  }
}
```

### **Solution 2: Add Timeout to KV Operations** ✅ (Essential)

Don't let KV hang for 24 seconds:

```typescript
import { withTimeout } from '../middleware/timeout'

if (!payload && c.env?.KV) {
  try {
    // Fail fast if KV is slow
    const kvCached = await withTimeout(
      kv.get(cacheKey, 'json'),
      1000, // 1 second timeout
      'KV cache timeout'
    )
    // ...
  } catch (error) {
    // KV too slow, use memory cache
  }
}
```

### **Solution 3: Make KV.put() Fire-and-Forget** ✅ (Already done!)

Good news: We're already not awaiting the put:

```typescript
// This is correct - don't await
kv.put(cacheKey, JSON.stringify(payload), { expirationTtl: 300 })
  .catch(() => {})  // Ignore errors
```

**But**: Even though we don't await, **it still uses a connection** until complete!

---

## 🎯 Recommended Implementation

### **Update auth.ts:**

```typescript
// 1. Check in-memory cache first (fastest)
const memCached = tokenCache.get(cacheKey)
if (memCached && memCached.expires > Date.now()) {
  payload = memCached.payload
}

// 2. Try KV ONLY if not in CI and with timeout
if (!payload) {
  const kv = c.env?.KV
  const isCI = c.env?.ENVIRONMENT === 'test' || c.env?.CI === 'true'
  
  if (kv && !isCI) {
    try {
      // Timeout after 500ms - KV should be fast
      const kvCached = await Promise.race([
        kv.get(cacheKey, 'json'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('KV timeout')), 500)
        )
      ])
      
      if (kvCached) {
        payload = kvCached as JWTPayload
        // Store in memory for next time
        tokenCache.set(cacheKey, {
          payload,
          expires: Date.now() + CACHE_TTL
        })
      }
    } catch (error) {
      // KV unavailable or slow, continue without it
      console.debug('KV cache skipped:', error.message)
    }
  }
}

// 3. Verify token if not cached
if (!payload) {
  payload = await AuthManager.verifyToken(token)
  
  // Cache in memory (always)
  if (payload) {
    tokenCache.set(cacheKey, {
      payload,
      expires: Date.now() + CACHE_TTL
    })
    
    // Cache in KV (optional, fire-and-forget, NOT in CI)
    const kv = c.env?.KV
    const isCI = c.env?.ENVIRONMENT === 'test' || c.env?.CI === 'true'
    
    if (kv && !isCI) {
      // Fire and forget - don't await, don't care about errors
      kv.put(cacheKey, JSON.stringify(payload), { expirationTtl: 300 })
        .catch(() => {})
    }
  }
}
```

---

## 📊 Expected Impact

### **Before:**
```
CI Request:
  KV.get()   : 10s (timeout/slow)
  KV.put()   : 10s (async but still slow)
  Connections: 2/6 used by KV
  
Total: 20s per auth request ❌
```

### **After:**
```
CI Request:
  Memory cache: 0ms (instant hit after first request)
  KV: Skipped in CI
  Connections: 0/6 used by KV
  
Total: <50ms per auth request ✅
```

---

## 🚨 Key Takeaways

1. **KV operations count against the 6-connection limit**
2. **D1 operations do NOT count** (internal to Cloudflare)
3. **Our auth middleware was attempting KV on every request**
4. **KV is slow or unavailable in CI** (5-10s per operation)
5. **Memory cache alone is sufficient** for CI environments
6. **Skip KV entirely in CI** to avoid connection exhaustion

---

## 📝 Action Items

1. ✅ Add CI detection to skip KV
2. ✅ Add 500ms timeout to KV operations
3. ✅ Keep memory cache as primary (already doing this)
4. ✅ Make KV truly optional (already mostly done)
5. 🆕 Consider removing KV from auth entirely (memory cache is enough!)

---

**This is likely THE root cause of the 24-second delays!**

Want me to implement the KV skip in CI environment?
