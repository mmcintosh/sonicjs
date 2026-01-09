# Contact Form Test Failure Investigation Results

**CI Run:** [20823270410](https://github.com/mmcintosh/sonicjs/actions/runs/20823270410)  
**Date:** 2026-01-08 16:06 UTC  
**Branch:** `feature/contact-plugin-v1`  
**Commit:** `8518de0c` (includes our `last_updated` fix)

---

## 🔍 What I Found

### Test Artifacts Downloaded ✅
- Downloaded Playwright report
- Downloaded test videos
- Downloaded screenshots

### Test Flow Analysis

**Test:** "should allow admin to enable the Google Map"

**What Worked:**
1. ✅ Login successful
2. ✅ Navigated to `/admin/plugins/contact-form`
3. ✅ Settings page loaded correctly
4. ✅ Form displayed with all fields:
   - Company Name: "My Company"
   - Phone Number: "555-0199"
   - Street Address: "123 Web Dev Lane"
   - City: **"Baltimore"** ✅
5. ✅ "Enable Google Map" checkbox was checked
6. ✅ Map API Key filled: **"AIzaFakeKeyForTesting"** ✅
7. ✅ "Save Settings" button was visible and clickable

**Where It Failed:**
The error context snapshot shows the settings page **BEFORE** clicking "Save Settings". This means the test failed at one of these points:

1. **Clicking "Save Settings"** - Button click might have failed
2. **Waiting for response** - The POST request might have returned non-200
3. **Navigating to /contact** - Navigation might have timed out
4. **Checking for map** - Map iframe might not have rendered

---

## 💡 Key Hypothesis: Settings Not Persisting (AGAIN)

Even with our `last_updated` fix, the settings might still not be saving correctly. Here's why:

### Evidence

**From error-context.md:**
- The page snapshot is captured at the settings page
- No evidence of navigation to `/contact` page
- This suggests the test failed before or during the "Save Settings" click

### Possible Root Causes

1. **JavaScript Fetch Still Failing**
   - Our Bearer token workaround might not work in CI
   - CORS or CSP issues in Cloudflare Workers preview
   - Network timeout

2. **D1 Query Still Failing**
   - The `last_updated` column fix might not be enough
   - Transaction not committing
   - D1 eventual consistency issues

3. **Plugin Not Activated**
   - Plugin might be installed but not activated
   - Settings save might check for active status
   - Bootstrap might not have activated it

4. **Migration Order Issue**
   - We have TWO migration files:
     - `my-sonicjs-app/migrations/030_contact_form_plugin.sql`
     - `my-sonicjs-app/src/plugins/contact-form/migrations/001_contact_form_plugin.sql`
   - One might be overwriting the other
   - Conflict between the two

---

## 🎯 Recommended Fixes (In Priority Order)

### Fix #1: Check Test Code - Settings Save Step

The test might be asserting something before actually clicking "Save Settings". Let me verify:

**Current test code (from commit `8518de0c`):**
```typescript
// 3. Save and wait for the network request to complete
const responsePromise = page.waitForResponse(response => 
  response.url().includes('/admin/plugins/contact-form') && 
  response.request().method() === 'POST'
);

await page.getByRole('button', { name: 'Save Settings' }).click();

// Wait for the POST request to complete
const response = await responsePromise;
const status = response.status();
console.log(`[Test] Settings save response status: ${status}`);

// Verify the response was successful
expect(status).toBe(200);
```

**Hypothesis:** The test is failing at `expect(status).toBe(200)` because the response is **500** (Internal Server Error).

**Why 500?**
- Our `last_updated` fix might have a bug
- The `INSERT` part of check-then-upsert might be failing
- SQL syntax error in the upsert logic

### Fix #2: Remove Duplicate Migration

We have two migration files:
1. `my-sonicjs-app/migrations/030_contact_form_plugin.sql` - App-level migration
2. `my-sonicjs-app/src/plugins/contact-form/migrations/001_contact_form_plugin.sql` - Plugin-level migration

**Action:** Keep only `030_contact_form_plugin.sql` and delete the duplicate.

### Fix #3: Verify D1 Column Names in ALL Queries

Check that EVERY query in `contact.ts` uses `last_updated` and `installed_at`, NOT `updated_at` and `created_at`.

**Files to check:**
- `activate()` method
- `deactivate()` method
- `getSettings()` method (should work, only SELECTs)

### Fix #4: Add More Defensive Checks

In `saveSettings()`:

```typescript
async saveSettings(settings: ContactSettings): Promise<void> {
  try {
    console.log('[ContactService] Saving settings:', JSON.stringify(settings))
    
    // Check if plugin row exists
    const existing = await this.db
      .prepare(`SELECT id, status FROM plugins WHERE id = ?`)
      .bind(manifest.id)
      .first()
    
    console.log('[ContactService] Existing plugin:', JSON.stringify(existing))

    if (existing) {
      // Update existing row
      const result = await this.db
        .prepare(`UPDATE plugins SET settings = ?, last_updated = ? WHERE id = ?`)
        .bind(JSON.stringify(settings), Date.now(), manifest.id)
        .run()
      console.log('[ContactService] UPDATE result:', JSON.stringify(result))
    } else {
      // Insert new row - should not happen if migration ran
      console.error('[ContactService] WARN: Plugin row does not exist, inserting...')
      const result = await this.db
        .prepare(`
          INSERT INTO plugins (id, name, display_name, description, version, status, settings, installed_at, last_updated)
          VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
        `)
        .bind(
          manifest.id,
          manifest.name,
          manifest.displayName,
          manifest.description || '',
          manifest.version || '1.0.0',
          JSON.stringify(settings),
          Date.now(),
          Date.now()
        )
        .run()
      console.log('[ContactService] INSERT result:', JSON.stringify(result))
    }
    
    console.log('[ContactService] Settings saved successfully')
  } catch (error) {
    console.error('[ContactService] Error saving settings:', error)
    throw new Error(`Failed to save contact form settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
```

---

## 🚀 Immediate Action Plan

### Step 1: Check Server Logs for 500 Error

The CI run should have server logs showing the actual error. Need to check GitHub Actions logs for:
```
[ContactService] Error saving settings:
```

### Step 2: Verify Column Names

```bash
git show 8518de0c:my-sonicjs-app/src/plugins/contact-form/services/contact.ts | grep -E "updated_at|created_at|last_updated|installed_at"
```

Should show:
- ✅ `last_updated` (NOT `updated_at`)
- ✅ `installed_at` (NOT `created_at`)

### Step 3: Check for Duplicate Migrations

```bash
git show 8518de0c:my-sonicjs-app/src/plugins/contact-form/migrations/001_contact_form_plugin.sql
```

If this file exists and conflicts with `030_contact_form_plugin.sql`, delete it.

### Step 4: Test Locally with Fresh D1

```bash
# Delete local D1
rm -rf .wrangler/state/v3/d1

# Run setup
npm run setup:db

# Start server
npm run dev

# Test the Contact Form settings save manually
```

---

## 📊 What We Know For Sure

| Item | Status | Evidence |
|------|--------|----------|
| Our fix is on the branch | ✅ | Commit `8518de0c` is latest |
| Migration file exists | ✅ | `030_contact_form_plugin.sql` present |
| `migrations_dir` is correct | ✅ | Set to `"./migrations"` |
| Settings page loads | ✅ | Screenshot shows form |
| Form can be filled | ✅ | Test data visible in snapshot |
| "Save Settings" button exists | ✅ | Visible in snapshot |
| Test reaches save step | ❓ | Unclear if click succeeded |
| Server returns 200 OK | ❌ | Likely returning 500 |
| Settings persist in D1 | ❌ | Probably failing here |

---

## 🎯 Most Likely Root Cause

**The `saveSettings()` method is still failing with a 500 error**, even with our `last_updated` fix.

**Why?**
1. **We fixed the UPDATE query** ✅
2. **We fixed the INSERT query** ✅
3. **BUT:** We might have missed other queries (activate/deactivate)
4. **OR:** The check query itself might be failing
5. **OR:** There's a constraint violation (unique constraint, foreign key, etc.)

---

## 🔧 Recommended Next Step

**Check the actual server logs from CI** to see the exact error:

```bash
gh run view 20823270410 --repo mmcintosh/sonicjs --log | grep -A10 -B5 "ContactService\|contact-form\|500\|Error saving"
```

This will show us the **exact SQL error** or other failure reason.

---

**Current Status:** Investigation complete, root cause narrowed down to settings persistence failure. Need server logs to confirm exact error.
