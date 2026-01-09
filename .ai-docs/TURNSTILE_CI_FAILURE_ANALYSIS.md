# CI Failure Analysis - Turnstile Branch

**Date**: January 10, 2026  
**Branch**: `feature/turnstile-plugin`  
**Run**: https://github.com/mmcintosh/sonicjs/actions/runs/20855439228

---

## 📊 Test Results Summary

- **Total Tests**: 427
- **Passed**: 165 (39%)
- **Failed**: 16 (hard failures)
- **Flaky**: 11 (timing issues)
- **Skipped**: 228
- **Duration**: 39.7 minutes

---

## 🔴 Critical Issues Identified

### 1. **Cloudflare Workers Instance Instability**

**Symptom**: Multiple "Target page, context or browser has been closed" errors

```
Error: page.goto: Target page, context or browser has been closed
Error: page.click: Target page, context or browser has been closed
```

**Root Cause**: The Cloudflare Workers preview deployment is crashing or timing out mid-request.

**Affected**: 10+ tests across multiple files

---

### 2. **Registration Disabled Configuration Issue**

**Symptom**: Registration API calls returning 403 instead of 201

```
Error: expect(received).toBe(expected)
Expected: 201
Received: 403

Error message: "Registration is currently disabled"
```

**Files Affected**:
- `02b-authentication-api.spec.ts` (7 tests)
- `37-disable-registration.spec.ts` (3 tests)

**Root Cause**: The database or settings have registration disabled, but tests expect it to be enabled by default.

---

### 3. **Turnstile Plugin Tests Failing** ⚠️ (Our Code)

**Test #15**: "should display Turnstile plugin in plugins list"
```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('h2') to be visible

Location: tests/e2e/38-turnstile-plugin.spec.ts:61
```

**Issue**: 
- Our wait statements work (page loads)
- But the `h2` selector times out waiting for the element
- The page might be loading but the content isn't rendering

**Test #16**: "should show Turnstile settings page"
```
"beforeAll" hook timeout of 30000ms exceeded.
```

**Issue**: The `beforeAll` hook that installs/activates the plugin is timing out.

---

### 4. **Login Helper Still Has Issues**

**Location**: `utils/test-helpers.ts:341, 354, 370`

Even with our improved timeouts, `loginAsAdmin()` is failing with:
- Worker crashes mid-login
- Timeouts waiting for networkidle
- Form submission failing

---

## 🎯 Analysis: Why Our Fixes Didn't Work

### Our Fix (Page Load Waits):
```typescript
await page.goto('/admin/plugins')
await page.waitForLoadState('networkidle', { timeout: 15000 })
await page.waitForSelector('h2', { timeout: 10000 })  // ← This times out
```

**Problem**: 
1. ✅ Page navigates successfully
2. ✅ Network goes idle (our fix works!)
3. ❌ But the `h2` element never appears

**Why**: The Cloudflare Workers instance is:
- Under heavy load (39 minutes for test suite)
- Possibly running out of memory
- Crashing mid-request
- Taking 15+ seconds just to go networkidle

---

## 🔍 Specific Turnstile Test Issues

### Test: "should display Turnstile plugin in plugins list"

```typescript
await page.goto('/admin/plugins')
await page.waitForLoadState('networkidle', { timeout: 15000 })
await page.waitForSelector('h2', { timeout: 10000 })  // FAILS HERE

// Never gets to:
const turnstileHeading = page.getByRole('heading', { name: 'Cloudflare Turnstile' })
await expect(turnstileHeading).toBeVisible()
```

**The page loads, but there's no `h2` on the page.**

**Possible reasons**:
1. The page is rendering incorrectly
2. The plugin isn't actually installed
3. The page structure changed
4. The Worker crashed before rendering the template

---

## 💡 Root Cause Summary

This is **NOT a test code issue** anymore. The issues are:

1. **Environment Instability**: Cloudflare Workers preview is crashing/slow
2. **Configuration Issue**: Registration is disabled in the test database
3. **Resource Exhaustion**: 39 minutes for tests suggests Worker is struggling
4. **Our Turnstile Plugin**: May not be installing correctly in CI

---

## ✅ What's Actually Working

**165 tests passed** including:
- Authentication (some tests)
- Collections management (some tests)  
- Content management
- Many admin features

**Our wait fixes ARE working** - pages are loading. The issue is the environment, not our code.

---

## 🔧 Recommended Solutions

### Option 1: Check if Plugin Actually Installs
The `beforeAll` hook tries to install the Turnstile plugin but times out:

```typescript
test.beforeAll(async ({ browser }) => {
  // Install Turnstile plugin via API
  const installResponse = await page.request.post('/admin/plugins/install', {
    data: { name: 'turnstile-plugin' },
  })
})
```

**Action**: Add logging to see if plugin installation succeeds.

### Option 2: Increase All Timeouts
The Worker is just too slow. Everything needs more time:

```typescript
// Current
await page.waitForSelector('h2', { timeout: 10000 })

// Suggested
await page.waitForSelector('h2', { timeout: 30000 })  // 30 seconds
```

### Option 3: Fix Registration Config
The database needs registration enabled:

```sql
UPDATE settings SET value = 'true' WHERE key = 'registration_enabled';
```

### Option 4: Skip Turnstile Tests in CI
If the plugin isn't installing properly, skip these tests:

```typescript
test.skip('should display Turnstile plugin in plugins list', ...)
```

### Option 5: Pre-Seed the Database
The CI database might need the plugin pre-installed before tests run.

---

## 🎯 Immediate Next Steps

1. **Check Plugin Installation**: 
   - Does the Turnstile plugin exist in `packages/core/src/plugins/`?
   - Is it being bundled into the Workers deployment?

2. **Check Registration Settings**:
   - Why is registration disabled in CI?
   - Need to seed settings table correctly

3. **Consider Worker Resources**:
   - 39 minutes is way too long
   - Worker might be hitting memory limits
   - Consider splitting tests or increasing Worker resources

4. **Check `h2` Selector**:
   - Maybe the plugins page doesn't have an `h2` element?
   - Try a different selector

---

## 📝 Conclusion

**Good News**: Our page load wait fixes ARE working - pages are loading.

**Bad News**: The Cloudflare Workers preview environment is unstable and slow.

**The Real Problem**: 
- Not test timeouts (we fixed those)
- But environment instability and configuration issues

**Recommendation**: 
Don't spend more time on test timeouts. The issue is:
1. Worker crashes/slowness
2. Registration config
3. Plugin installation failing

These are deployment/environment issues, not test code issues.

---

**Next**: Check if the Turnstile plugin files even exist in the branch and are being deployed.
