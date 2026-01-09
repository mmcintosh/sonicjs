# Action Plan: Failed Workflows Resolution

**Date:** 2026-01-08  
**Status:** Ready for investigation

---

## 🎯 Priority Order

### 1. Contact Form (PR #2) - HIGHEST PRIORITY
**Why:** We just fixed it, CI ran with the fix and still failed. Need to understand why.

### 2. Turnstile (PR #6) - MEDIUM PRIORITY  
**Why:** Known test infrastructure issues, might resolve with upstream fixes.

### 3. AI Search (PR #7) - NO ACTION NEEDED ✅
**Why:** Already passing!

---

## 📋 Immediate Next Steps

### Step 1: Download Contact Form Test Artifacts

```bash
cd /home/siddhartha/Documents/cursor-sonicjs/sonicjs/github/sonicjs

# Download artifacts from the failed run
gh run download 20823270410 --repo mmcintosh/sonicjs --dir /tmp/contact-form-failure

# Open the Playwright report
cd /tmp/contact-form-failure/playwright-report
# Then open index.html in browser
```

**What to look for:**
- Which specific test failed
- Error message
- Screenshots
- The DEBUG div output (showing settings values)

### Step 2: Check Debug Output

The Contact Form page has this debug div (from commit `58757619`):

```html
<div class="alert alert-info">
  <strong>DEBUG:</strong> showMap=${String(showMap)} | 
  isEnabled=${String(isEnabled)} | hasKey=${String(hasKey)} | 
  settings.showMap=${JSON.stringify(settings.showMap)} | 
  apiKey.length=${apiKey.length} | city=${city}
</div>
```

This will tell us if:
- Settings are being loaded correctly
- `showMap` flag is true
- API key is present
- City is set

### Step 3: Verify Fix Applied

Check that commit `8518de0c` includes our `last_updated` changes:

```bash
git show 8518de0c:my-sonicjs-app/src/plugins/contact-form/services/contact.ts | grep -A5 "last_updated"
```

---

## 🔍 Investigation Checklist

### Contact Form Issues

- [ ] Confirm our `last_updated` fix is in the failing commit
- [ ] Review Playwright report for exact error
- [ ] Check if test is timing out or getting specific error
- [ ] Review debug div output from screenshots
- [ ] Verify settings are persisting in D1
- [ ] Check if plugin is activated before test runs
- [ ] Confirm migration `030_contact_form_plugin.sql` ran successfully

### Turnstile Issues

- [ ] Compare failure with previous run (before re-sync)
- [ ] Check if same 11 tests are failing
- [ ] Review if login helper issues persist
- [ ] Check upstream main for similar failures
- [ ] Verify Turnstile migration exists and runs

---

## 💡 Hypotheses to Test

### Contact Form Hypothesis #1: Settings Still Not Persisting
**Test:** Check debug div output in screenshots  
**Expected:** Should show `settings.showMap=true`, `hasKey=true`, `city=Baltimore`  
**If not:** Settings save is still failing despite our fix

**Fix if true:**
- Add more logging to `saveSettings()` method
- Check if transaction is committing
- Verify D1 query syntax

### Contact Form Hypothesis #2: Plugin Not Activated
**Test:** Check if plugin row exists and status='active' in logs  
**Expected:** Bootstrap should install plugin from migration  
**If not:** Migration not running or plugin not auto-activating

**Fix if true:**
- Check if `030_contact_form_plugin.sql` status='inactive' is correct
- Add explicit activation in test setup
- Verify migration runs before tests

### Contact Form Hypothesis #3: Map Iframe Not Rendering
**Test:** Check screenshots for map iframe presence  
**Expected:** Should see `<iframe src="google.com/maps">`  
**If not:** Even with correct settings, map not rendering

**Fix if true:**
- Check if Google Maps API is accessible from CI
- Verify iframe HTML generation logic
- Check for JavaScript errors in console logs

### Turnstile Hypothesis #1: Inherited Upstream Issues
**Test:** Check `gh run list --repo lane711/sonicjs --branch main`  
**Expected:** Upstream might have same failing tests  
**If yes:** Not our problem, wait for upstream fix

**Fix if true:**
- Don't merge from upstream until fixed
- Or cherry-pick specific fixes only

### Turnstile Hypothesis #2: Timing Issues in CI
**Test:** Compare test durations (43 min vs 22 min for AI Search)  
**Expected:** Longer duration suggests timeout issues  
**If yes:** Tests are waiting/retrying

**Fix if true:**
- Increase test timeout from 30s to 60s
- Add explicit `waitForLoadState('networkidle')`
- Use more specific selectors

---

## 🚀 Quick Fixes to Try

### If Contact Form is Plugin Activation Issue

Add to test setup:
```typescript
test.beforeAll(async ({ page }) => {
  await loginAsAdmin(page)
  
  // Explicitly activate Contact Form plugin
  await page.goto('/admin/plugins')
  const contactFormRow = page.locator('[data-plugin-id="contact-form"]')
  const activateButton = contactFormRow.locator('button:has-text("Activate")')
  
  if (await activateButton.isVisible()) {
    await activateButton.click()
    await page.waitForLoadState('networkidle')
  }
})
```

### If Contact Form is Settings Persistence Issue

Change in `contact.ts`:
```typescript
// Add transaction wrapper
const tx = await this.db.batch([
  this.db.prepare(`UPDATE plugins SET settings = ?, last_updated = ? WHERE id = ?`)
    .bind(JSON.stringify(settings), Date.now(), manifest.id)
])
console.log('Settings saved in transaction:', tx)
```

### If Turnstile is Timing Issue

In test file:
```typescript
test.setTimeout(60000) // Increase from 30s to 60s

// And add explicit waits:
await page.waitForLoadState('networkidle')
await page.waitForTimeout(500) // Small buffer for HTMX
```

---

## 📊 Expected Outcomes

### Best Case
- Contact Form: Simple fix (remove debug div or adjust test assertion)
- Turnstile: Wait for upstream fix or adjust test timeouts

### Worst Case
- Contact Form: Fundamental issue with settings persistence in CI
- Turnstile: Major test infrastructure overhaul needed

### Most Likely
- Contact Form: Small issue with test or migration, easy fix
- Turnstile: Inherited upstream issues, can be worked around

---

## 🎯 Success Criteria

### Contact Form is Fixed When:
- [ ] Settings save returns 200 OK
- [ ] Settings persist and load correctly
- [ ] Map iframe renders with correct src
- [ ] Test passes in CI

### Turnstile is Fixed When:
- [ ] Login tests pass consistently
- [ ] No timing-related failures
- [ ] All Turnstile-specific tests pass

---

**Next Action:** Run Step 1 to download and review artifacts, then proceed based on findings.
