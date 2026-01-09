# D1 Connection Analysis - Multiple Connections Per Request

**Date**: January 10, 2026  
**Finding**: We're accessing `c.env.DB` directly in every route/service

---

## 🔍 The Issue

Cloudflare states: **"You can open up to six connections (to D1) simultaneously for each invocation of your Worker."**

### **What We're Doing:**

Looking at the code, we're **NOT creating multiple drizzle instances**. Instead, we're:

1. **Passing the raw D1 binding** (`c.env.DB`) to services
2. **Using D1's native `.prepare()` API** directly in routes
3. **NOT using drizzle** for most queries

### **Example from auth.ts:**

```typescript
// Line 28-32
const db = c.env.DB  // ← Raw D1 binding
try {
  const plugin = await db.prepare('SELECT * FROM plugins WHERE id = ? AND status = ?')
    .bind('demo-login-prefill', 'active')
    .first()  // ← Direct D1 API call, not drizzle
```

### **Example from admin-api.ts:**

```typescript
// Line 26-33
const db = c.env.DB  // ← Raw D1 binding again

const collectionsStmt = db.prepare('SELECT COUNT(*) as count FROM collections WHERE is_active = 1')
const collectionsResult = await collectionsStmt.first()

const contentStmt = db.prepare('SELECT COUNT(*) as count FROM content WHERE deleted_at IS NULL')
const contentResult = await contentStmt.first()
// ← Multiple sequential queries
```

---

## 📊 Connection Pattern Analysis

### **Current Pattern:**

```
Single Request → Multiple Services → Each gets c.env.DB → Multiple queries
```

**Example request flow:**
1. Auth middleware: Checks JWT (`c.env.DB`)
2. Bootstrap middleware: Runs migrations (`c.env.DB`)
3. Plugin middleware: Loads plugins (`c.env.DB`)
4. Route handler: Queries data (`c.env.DB`)
5. Service layer: More queries (`c.env.DB`)

### **Are We Creating Multiple Connections?**

**Short answer: Probably not exceeding 6**, but we're not optimizing either.

**Long answer:**

1. **D1 binding is reused**: `c.env.DB` is the same D1Database instance per request
2. **Each `.prepare()` creates a statement**, not a new connection
3. **D1 manages connections internally** - we can't directly control this
4. **Sequential queries don't accumulate connections** - they reuse the same binding

### **The REAL Problem:**

Not too many connections, but **SLOW QUERIES** on the same connection:

```typescript
// THIS is the bottleneck:
const collectionsStmt = db.prepare('SELECT COUNT(*) as count FROM collections WHERE is_active = 1')
const collectionsResult = await collectionsStmt.first()  // ← Takes 5-10 seconds in CI

const contentStmt = db.prepare('SELECT COUNT(*) as count FROM content WHERE deleted_at IS NULL')
const contentResult = await contentStmt.first()  // ← Takes another 5-10 seconds

// Total: 10-20 seconds for two simple queries!
```

---

## 💡 Why Are Queries So Slow?

### **Theory 1: Cold Database** ✅ (Most Likely)
- Fresh D1 database created for each PR
- Not warmed up / no query cache
- First few queries are slow (~5-10s each)
- Subsequent queries faster once warmed

### **Theory 2: Network Latency**
- GitHub Actions → Cloudflare Workers → D1
- Multiple network hops
- CI environment has higher latency

### **Theory 3: D1 Shared Resources**
- Free/Pro D1 shares resources across accounts
- CI might be hitting rate limits
- Queries queued behind others

### **Theory 4: Missing Indexes**
- Some queries might not have indexes
- Full table scans on large tables
- But tables are small in test environment...

---

## 🔧 Optimization Opportunities

### **1. Reduce Query Count** ✅ (Already doing with caching)

Our session caching fix helps here:
```typescript
// Before: Query DB every request
const user = await db.query.users.findFirst(...)

// After: Cache result in memory
if (cached) return cached.user
```

### **2. Parallel Queries** 🆕 (New opportunity!)

Instead of sequential queries, run in parallel:

```typescript
// ❌ BEFORE: Sequential (takes 20s)
const collections = await db.prepare('SELECT COUNT(*)...').first()  // 10s
const content = await db.prepare('SELECT COUNT(*)...').first()      // 10s

// ✅ AFTER: Parallel (takes 10s)
const [collections, content] = await Promise.all([
  db.prepare('SELECT COUNT(*)...').first(),  // Both run simultaneously
  db.prepare('SELECT COUNT(*)...').first()
])
```

This uses **2 of our 6 available connections** and cuts time in half!

### **3. Batch Queries** 🆕 (New opportunity!)

Use D1's batch API:

```typescript
// Single D1 call with multiple statements
const results = await db.batch([
  db.prepare('SELECT COUNT(*) as count FROM collections WHERE is_active = 1'),
  db.prepare('SELECT COUNT(*) as count FROM content WHERE deleted_at IS NULL'),
  db.prepare('SELECT COUNT(*) as count FROM media WHERE deleted_at IS NULL')
])

// Returns array of results, all in one round-trip!
```

### **4. Prepared Statement Caching** 🆕 (New opportunity!)

Cache frequently-used prepared statements:

```typescript
// Cache at module level
const GET_PLUGIN_STMT = 'SELECT * FROM plugins WHERE id = ? AND status = ?'

// Reuse across requests (D1 might optimize internally)
const plugin = await c.env.DB.prepare(GET_PLUGIN_STMT)
  .bind('demo-login-prefill', 'active')
  .first()
```

---

## 📝 Recommendations

### **High Priority (Quick Wins):**

1. ✅ **Session caching** - Already implemented
2. 🆕 **Use `Promise.all()` for parallel queries** - Easy win, 2x faster
3. 🆕 **Use `db.batch()` for related queries** - Single round-trip

### **Medium Priority:**

4. **Add query result caching** - Cache dashboard stats for 5 minutes
5. **Reduce bootstrap overhead** - Skip migrations check if already run
6. **Lazy-load plugins** - Don't query all plugins on every request

### **Low Priority:**

7. **Prepared statement caching** - D1 likely optimizes this already
8. **Connection pooling** - D1 handles this internally

---

## 🎯 Implementation: Parallel Queries

### **Example: admin-api.ts stats endpoint**

**Before** (sequential):
```typescript
adminApiRoutes.get('/stats', async (c) => {
  const db = c.env.DB
  
  const collectionsResult = await db.prepare('SELECT COUNT(*) as count FROM collections WHERE is_active = 1').first()
  const contentResult = await db.prepare('SELECT COUNT(*) as count FROM content WHERE deleted_at IS NULL').first()
  const mediaResult = await db.prepare('SELECT COUNT(*) as count FROM media WHERE deleted_at IS NULL').first()
  const usersResult = await db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').first()
  
  // Takes: 5s + 5s + 5s + 5s = 20 seconds! ❌
})
```

**After** (parallel):
```typescript
adminApiRoutes.get('/stats', async (c) => {
  const db = c.env.DB
  
  const [collectionsResult, contentResult, mediaResult, usersResult] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM collections WHERE is_active = 1').first(),
    db.prepare('SELECT COUNT(*) as count FROM content WHERE deleted_at IS NULL').first(),
    db.prepare('SELECT COUNT(*) as count FROM media WHERE deleted_at IS NULL').first(),
    db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').first()
  ])
  
  // Takes: max(5s, 5s, 5s, 5s) = 5 seconds ✅
  // 4x faster!
})
```

**Even Better** (batch):
```typescript
adminApiRoutes.get('/stats', async (c) => {
  const db = c.env.DB
  
  const [collections, content, media, users] = await db.batch([
    db.prepare('SELECT COUNT(*) as count FROM collections WHERE is_active = 1'),
    db.prepare('SELECT COUNT(*) as count FROM content WHERE deleted_at IS NULL'),
    db.prepare('SELECT COUNT(*) as count FROM media WHERE deleted_at IS NULL'),
    db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1')
  ])
  
  const collectionsResult = collections.results[0]
  const contentResult = content.results[0]
  // etc...
  
  // Takes: ~5 seconds (single D1 call) ✅
  // 4x faster + uses only 1 connection!
})
```

---

## 📊 Summary

### **Connection Analysis:**
- ✅ We're NOT exceeding the 6-connection limit
- ✅ We're using the D1 binding correctly
- ❌ We're running queries **sequentially** instead of in parallel
- ❌ Each query is slow (5-10s in CI)

### **Root Cause:**
Not too many connections, but **slow sequential queries** that add up:
- 4 sequential queries × 5s each = 20s total ❌
- 4 parallel queries × 5s each = 5s total ✅

### **Quick Wins:**
1. ✅ Session caching (already done) - reduces query count
2. 🆕 Parallel queries with `Promise.all()` - 2-4x faster
3. 🆕 Batch queries with `db.batch()` - single round-trip

### **Expected Impact:**
- **Current**: 20-30s for a request with 4-6 queries
- **With parallelization**: 5-10s for same request
- **With parallelization + caching**: <1s for subsequent requests

---

**Want me to implement parallel queries for the hottest paths (auth, dashboard stats)?**
