# 🚀 Parallel Workers for E2E Tests - 427 Tests → Much Faster!

**Date**: January 10, 2026  
**Status**: 💡 PROPOSAL

---

## 🔍 Current State

**Configuration**: `tests/playwright.config.ts` Line 20
```typescript
/* Use 1 worker to avoid database conflicts with in-memory D1 */
workers: 1,
```

**Result**: 
- **427 tests** running serially on **1 worker**
- Takes **~30-45 minutes** in CI
- Only uses **1 of 6 available Cloudflare connections**

---

## 💡 The Opportunity

You have **6 concurrent connection spots** on your Cloudflare paid plan!

### Why 1 Worker?
The comment says: "avoid database conflicts with in-memory D1"

### Why This is Safe in CI:
✅ **Each PR gets its own isolated D1 database**
- Created fresh in CI: `sonicjs-pr-{branch-name}`
- Completely isolated from other PRs
- No database conflicts possible!

✅ **KV is now skipped in CI**
- No KV connection usage
- No connection exhaustion

✅ **D1 queries don't count against the 6-connection limit**
- Only fetch(), KV, R2, Queues, and WebSockets count
- D1 is internal to Cloudflare

---

## 🎯 Proposed Solution

### Option 1: **Dynamic Workers Based on Environment**

```typescript
// tests/playwright.config.ts
export default defineConfig({
  // ... other config
  
  /* Use multiple workers in CI (isolated DB), 1 worker locally (shared DB) */
  workers: process.env.CI ? 4 : 1,
  
  // ... rest of config
});
```

**Impact**:
- Local: 1 worker (safe, no conflicts)
- CI: 4 workers (4x faster!)
- 427 tests ÷ 4 workers = ~107 tests per worker
- **Estimated time: 10-15 minutes** instead of 30-45 minutes

### Option 2: **Test Sharding with Matrix Strategy**

Modify `.github/workflows/pr-tests.yml`:

```yaml
test:
  needs: authorize
  runs-on: ubuntu-latest
  timeout-minutes: 60
  strategy:
    fail-fast: false
    matrix:
      shard: [1, 2, 3, 4]  # 4 parallel jobs
      
  steps:
    # ... existing steps ...
    
    - name: Run E2E tests (Shard ${{ matrix.shard }}/4)
      if: github.actor != 'dependabot[bot]'
      run: |
        cd tests
        npx playwright test --shard=${{ matrix.shard }}/4
      env:
        BASE_URL: ${{ steps.deploy.outputs.preview_url }}
```

**Impact**:
- 4 GitHub Actions jobs running in parallel
- Each job runs ~107 tests
- Each job deploys to the **same Workers preview** (shared BASE_URL)
- **Estimated time: 10-15 minutes** total

---

## ⚖️ Pros & Cons

### **Option 1: Dynamic Workers** (Recommended)

**Pros:**
- ✅ Simple config change (1 line)
- ✅ Tests run in parallel against single Workers instance
- ✅ Uses only 1 Workers deployment
- ✅ No GitHub Actions changes needed
- ✅ Easier to debug (single test job)

**Cons:**
- ⚠️ All 4 workers hit the same Workers instance
- ⚠️ Could expose concurrency bugs (actually a good thing!)
- ⚠️ Workers CPU might be the bottleneck

### **Option 2: Test Sharding**

**Pros:**
- ✅ True parallelization at GitHub level
- ✅ Failures easier to identify by shard
- ✅ Can scale beyond 4 shards if needed

**Cons:**
- ⚠️ More complex workflow
- ⚠️ Still uses same Workers deployment (same bottleneck)
- ⚠️ Harder to debug (logs split across jobs)
- ⚠️ Can't easily shard beyond 6 workers (connection limit)

---

## 🧪 Recommendation: **Option 1 First**

**Start simple:**

1. Change `workers: 1` → `workers: process.env.CI ? 4 : 1`
2. Commit and push
3. Watch CI run with 4 workers
4. If successful, consider increasing to 6 workers

**Why 4 instead of 6?**
- Leave 2 connections for other operations (admin panel, migrations, etc.)
- 4 workers = ~10-15 min (good enough!)
- Can always increase later

---

## 📊 Expected Performance

| Scenario | Workers | Time | Notes |
|----------|---------|------|-------|
| Current | 1 | 30-45 min | Serial execution |
| Proposed | 4 | 10-15 min | 3-4x speedup |
| Aggressive | 6 | 8-12 min | Max parallelism |

---

## ⚠️ Risks & Mitigation

### **Risk 1: Workers CPU Bottleneck**
If 4 workers all hammer the same Workers instance, it might still be slow.

**Mitigation**: 
- Start with 4 workers
- Monitor Workers CPU usage
- Our performance fixes should handle this

### **Risk 2: Flaky Tests**
Parallel execution can expose race conditions.

**Mitigation**:
- We have `retries: 2` in CI
- Good E2E tests should be isolated anyway

### **Risk 3: Database Conflicts**
Multiple workers writing to same D1 database.

**Mitigation**:
- Tests should use unique data (timestamps, UUIDs)
- Admin user is created once in global setup
- Most tests read-only after setup

---

## 🚀 Implementation Steps

### **Quick Win (5 minutes):**

1. **Edit `tests/playwright.config.ts`**:
   ```typescript
   workers: process.env.CI ? 4 : 1,
   ```

2. **Commit and push**:
   ```bash
   git add tests/playwright.config.ts
   git commit -m "perf: use 4 parallel workers in CI for faster E2E tests"
   git push
   ```

3. **Watch CI run** - should complete in ~10-15 min instead of 30-45 min!

---

## 💡 Alternative: Use Both Options

If Workers CPU is still a bottleneck, we could:
1. Keep `workers: 1` in Playwright config
2. Use GitHub matrix sharding with 4 shards
3. Each shard deploys to a **different Workers preview** (different branch?)

But this is more complex and probably unnecessary.

---

## 🎯 Recommendation

**Start with Option 1**: Simple config change, massive speedup, low risk.

If 4 workers work well, try 5 or 6 next time!

Let me know if you want me to implement this now! 🚀
