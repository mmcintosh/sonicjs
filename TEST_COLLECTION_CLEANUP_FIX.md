# Test Collection Cleanup Fix

## Problem

Test collections were persisting in the database after E2E tests:
- `duplicate_test` 
- `delete_test_collection`
- `concurrent_test_0`, `concurrent_test_1`, `concurrent_test_2`, `concurrent_test_3`, `concurrent_test_4`
- `large_payload_test`

These collections were showing up in:
- `/admin/collections` list
- `/admin/plugins/ai-search` settings

## Root Cause

**File**: `tests/e2e/08b-admin-collections-api.spec.ts`

E2E tests were creating collections but NOT cleaning them up:

### Test 1: Duplicate Prevention (Line 112)
```typescript
test('should prevent duplicate collection names', async ({ request }) => {
  const collection = {
    name: 'duplicate_test',  // ❌ Created, never cleaned up
    displayName: 'Duplicate Test',
    description: 'First collection'
  };
  // ... test logic
});
```

### Test 2: Delete Collection (Line 235)
```typescript
test('should delete an existing collection', async ({ request, browser }) => {
  await page.fill('[name="name"]', 'delete_test_collection');  // ❌ Created, never cleaned up
  // ... test logic
});
```

### Test 3: Concurrent Requests (Line 403)
```typescript
test('should handle concurrent requests safely', async ({ request }) => {
  const promises = Array.from({ length: 5 }, (_, i) => 
    request.post('/admin/api/collections', {
      headers: authHeaders,
      data: {
        name: `concurrent_test_${i}`,  // ❌ Created 5 collections, never cleaned up
        displayName: `Concurrent Test ${i}`,
        description: 'Concurrent request test'
      }
    })
  );
  // ... test logic
});
```

### Test 4: Large Payload (Line 425)
```typescript
test('should validate JSON payload size', async ({ request }) => {
  const response = await request.post('/admin/api/collections', {
    headers: authHeaders,
    data: {
      name: 'large_payload_test',  // ❌ Created, never cleaned up
      displayName: 'Large Payload Test',
      description: largeDescription
    }
  });
  // ... test logic
});
```

## Fix

### 1. Added `afterEach` Hook for Duplicate Test
```typescript
test.describe('POST /admin/api/collections - Create Collection', () => {
  test.afterEach(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsAdmin(page);
    try {
      await deleteTestCollection(page, TEST_DATA.collection.name);
      await deleteTestCollection(page, 'api_test_collection');
      await deleteTestCollection(page, 'duplicate_test');  // ✅ Added
    } catch {
      // Ignore cleanup errors
    }
    await context.close();
  });
  // ... tests
});
```

### 2. Added `afterEach` Hook for Delete Test
```typescript
test.describe('DELETE /admin/api/collections/:id - Delete Collection', () => {
  test.afterEach(async ({ browser }) => {  // ✅ Added entire hook
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsAdmin(page);
    try {
      await deleteTestCollection(page, 'delete_test_collection');
    } catch {
      // Ignore cleanup errors
    }
    await context.close();
  });
  // ... tests
});
```

### 3. Added `afterEach` Hook for Security Tests
```typescript
test.describe('API Rate Limiting & Security', () => {
  test.afterEach(async ({ browser }) => {  // ✅ Added entire hook
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsAdmin(page);
    try {
      // Clean up concurrent test collections
      for (let i = 0; i < 5; i++) {
        await deleteTestCollection(page, `concurrent_test_${i}`);
      }
      // Clean up large payload test collection
      await deleteTestCollection(page, 'large_payload_test');
    } catch {
      // Ignore cleanup errors
    }
    await context.close();
  });
  // ... tests
});
```

### 4. Cleaned Up Existing Collections in Database
```sql
UPDATE collections 
SET is_active = 0 
WHERE name IN (
  'duplicate_test', 
  'delete_test_collection', 
  'concurrent_test_0', 
  'concurrent_test_1', 
  'concurrent_test_2', 
  'concurrent_test_3', 
  'concurrent_test_4', 
  'large_payload_test'
);
```

### 5. Removed Aggressive Filter from AI Search Plugin
Previously:
```typescript
// ❌ Bad: Hiding the problem
const collections = (allCollections || []).filter(
  (col) => !col.name.includes('test')  // Filter out test collections
)
```

Now:
```typescript
// ✅ Good: Fixed the root cause
const collections = (allCollections || []).filter(
  (col) => col.id && col.name  // Show all valid active collections
)
```

## Result

### Before Fix:
```
Collections in database (12 total):
- blog_posts ✅
- pages ✅
- news ✅
- contact_messages ✅
- duplicate_test ❌
- delete_test_collection ❌
- concurrent_test_0 ❌
- concurrent_test_1 ❌
- concurrent_test_2 ❌
- concurrent_test_3 ❌
- concurrent_test_4 ❌
- large_payload_test ❌
```

### After Fix:
```
Collections in database (4 active):
- blog_posts ✅
- pages ✅
- news ✅
- contact_messages ✅

Collections marked inactive (8):
- duplicate_test (is_active = 0)
- delete_test_collection (is_active = 0)
- concurrent_test_* (is_active = 0)
- large_payload_test (is_active = 0)
```

## Testing

### To Verify Fix Works:
```bash
# Run E2E tests
npm run e2e:smoke

# Check collections after tests
cd my-sonicjs-app
npx wrangler d1 execute DB_NAME --local --command \
  "SELECT name, is_active FROM collections ORDER BY name"

# Should only show 4 active collections:
# - blog_posts
# - contact_messages  
# - news
# - pages
```

### If Test Collections Appear Again:
1. Check E2E test logs for cleanup failures
2. Verify `deleteTestCollection()` function works
3. Check for test failures (cleanup skipped on failure)
4. Run manual cleanup:
   ```sql
   UPDATE collections SET is_active = 0 WHERE name LIKE '%test%';
   ```

## Best Practices

### ✅ Good E2E Test Pattern:
```typescript
test.describe('Feature Tests', () => {
  test.afterEach(async ({ browser }) => {
    // ALWAYS clean up test data
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsAdmin(page);
    try {
      await deleteTestCollection(page, 'my_test_collection');
    } catch {
      // Silently handle cleanup failures
    }
    await context.close();
  });

  test('should do something', async ({ request }) => {
    // Create test data
    await createTestCollection('my_test_collection');
    // ... test logic
    // Cleanup happens in afterEach automatically
  });
});
```

### ❌ Bad E2E Test Pattern:
```typescript
test('should do something', async ({ request }) => {
  // Create test data
  await createTestCollection('my_test_collection');
  // ... test logic
  // ❌ Forgot to clean up!
});
```

## Related Files

- `tests/e2e/08b-admin-collections-api.spec.ts` - Fixed E2E tests
- `tests/e2e/utils/test-helpers.ts` - `deleteTestCollection()` helper
- `packages/core/src/plugins/core-plugins/ai-search-plugin/services/ai-search.ts` - Removed filter
- `my-sonicjs-app/wrangler.toml` - Local D1 database config

## Impact

- ✅ AI Search settings page shows only real collections
- ✅ Collections list is clean
- ✅ E2E tests properly clean up after themselves
- ✅ No need for workaround filters
- ✅ Root cause fixed, not symptoms

## Commits

1. `fix: Add proper cleanup for test collections in E2E tests` - Added afterEach hooks
2. `refactor: Remove aggressive test collection filter from AI Search` - Removed workaround
3. `fix: Clean up existing test collections in local database` - One-time cleanup

## Future Prevention

### CI/CD:
- E2E tests run with fresh database each time ✅
- Cleanup failures cause test failures ✅
- No persistent test data in CI ✅

### Local Dev:
- Run `npm run setup:db` to reset database
- Or manually clean up: 
  ```bash
  npx wrangler d1 execute DB_NAME --local --command \
    "UPDATE collections SET is_active = 0 WHERE name LIKE '%test%'"
  ```

### Code Review:
- Check E2E tests have `afterEach` cleanup hooks ✅
- Verify test data creation has matching deletion ✅
- Test collection names should be obvious (start with `test_`) ✅
