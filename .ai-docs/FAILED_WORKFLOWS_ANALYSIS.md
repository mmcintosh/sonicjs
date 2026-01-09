# Failed Workflow Analysis - 2026-01-08

**Status:** 2 out of 3 workflows failing

---

## Summary

| PR | Branch | Status | URL |
|----|--------|--------|-----|
| #7 | `feature/ai-search-plugin` | ✅ **SUCCESS** | [Run 20821747357](https://github.com/mmcintosh/sonicjs/actions/runs/20821747357) |
| #2 | `feature/contact-plugin-v1` | ❌ **FAILURE** | [Run 20823270410](https://github.com/mmcintosh/sonicjs/actions/runs/20823270410) |
| #6 | `feature/turnstile-plugin` | ❌ **FAILURE** | [Run 20823418764](https://github.com/mmcintosh/sonicjs/actions/runs/20823418764) |

---

## ✅ AI Search Plugin (PR #7) - SUCCESS

**Last Run:** 2026-01-08 15:17 UTC  
**Duration:** ~22 minutes  
**Result:** All tests passed

**Status:** Ready for review! This PR is good to go.

---

## ❌ Contact Form Plugin (PR #2) - FAILURE

**Last Run:** 2026-01-08 16:06 UTC (after our `last_updated` column fix)  
**Duration:** 16m 30s  
**Failed Step:** "Run E2E tests against preview"

### What We Fixed
- ✅ Changed `updated_at` to `last_updated` in plugins table queries
- ✅ Added explicit check-then-upsert logic for settings persistence
- ✅ Fixed authentication middleware

### Why It Might Still Be Failing

**Hypothesis 1: Test File Still Has Issues**
The test was timing out due to login/navigation issues. Our fix might not have fully addressed the problem.

**Hypothesis 2: Debug Div Output**
We added debug HTML output to the contact form page. This might be interfering with the test or displaying error info.

**Hypothesis 3: Migration Not Applied**
The `030_contact_form_plugin.sql` migration might not be running because:
- It's in `my-sonicjs-app/migrations/` but CI might not be picking it up
- The `wrangler.toml` `migrations_dir` setting might be wrong

**Hypothesis 4: Settings Not Persisting**
Even with our fix, settings might not be saving correctly in CI's fresh D1 database.

### Recommended Actions

1. **Check the test artifacts** at the GitHub URL
2. **Download `playwright-report`** to see which specific test failed
3. **Review the test video** to see what the UI looked like
4. **Check if map rendering debug info** shows the actual issue

---

## ❌ Turnstile Plugin (PR #6) - FAILURE

**Last Run:** 2026-01-08 16:10 UTC (after re-sync with upstream/main)  
**Duration:** ~43 minutes (longest run)  
**Failed Step:** "Run E2E tests against preview"

### What We Did
- ✅ Synced branch with `upstream/main` to get latest test fixes
- ✅ Updated `package-lock.json`
- ✅ Updated `wrangler.toml` with correct CI resources

### Previous Known Issues
From earlier analysis, the Turnstile branch was failing with:
- **11 failed tests** (login/authentication related)
- **18 flaky tests** (navigation/timing issues)
- **154 passed tests**

The failures were NOT Turnstile-specific, but general test infrastructure issues.

### Why It's Still Failing

**Hypothesis 1: Upstream Test Issues**
The upstream `main` branch might have unresolved test failures that we inherited when syncing.

**Hypothesis 2: Login Helper Issues**
The `loginAsAdmin()` helper might be timing out or failing due to:
- Success message not appearing (`.bg-green-100` element)
- Cookie/session issues in CI environment
- Navigation redirects not working

**Hypothesis 3: Timing Issues**
CI environment might be slower than local, causing timeouts in:
- Page loads
- HTMX swaps
- Form submissions

### Recommended Actions

1. **Check if upstream has similar failures**
2. **Compare test results** with the lead developer's CI runs
3. **Consider increasing test timeouts** for CI environment
4. **Review login helper** for CI-specific issues

---

## 🔍 Investigation Steps

### For Contact Form (Priority 1)

```bash
# Download artifacts
gh run download 20823270410 --repo mmcintosh/sonicjs

# Extract and review
cd playwright-report
open index.html  # Or use browser

# Look for:
# - Which test failed (likely "should allow admin to enable the Google Map")
# - Error message
# - Screenshots showing UI state
# - Debug div output showing settings values
```

### For Turnstile (Priority 2)

```bash
# Download artifacts
gh run download 20823418764 --repo mmcintosh/sonicjs

# Compare with previous runs
# Check if same 11 tests are failing
# Look for patterns in flaky tests
```

### For Both

```bash
# Check if there are newer commits on their branches
git fetch origin
git log origin/feature/contact-plugin-v1 -5 --oneline
git log origin/feature/turnstile-plugin -5 --oneline

# Check upstream main for test failures
gh run list --repo lane711/sonicjs --branch main --limit 5
```

---

## 📊 Pattern Analysis

### Common Issues Across Failed PRs

1. **Login/Authentication**
   - Both have authentication-related tests
   - Both interact with admin pages
   - Both might be affected by cookie/session issues

2. **Fresh D1 Database**
   - CI creates fresh database for each run
   - Plugins need to be bootstrapped
   - Settings need to persist correctly

3. **Timing/Async Issues**
   - E2E tests sensitive to page load timing
   - HTMX swaps might not complete before assertions
   - Network requests might timeout

### Success Factors from AI Search

AI Search passed because:
- ✅ No complex form submissions
- ✅ No third-party integrations (maps, turnstile)
- ✅ Simpler test scenarios
- ✅ Core plugin auto-activated by bootstrap

---

## 🎯 Recommended Next Steps

### Immediate (This Session)

1. **Download and review Contact Form artifacts**
   ```bash
   gh run download 20823270410 --repo mmcintosh/sonicjs
   ```

2. **Check latest commit on Contact Form branch**
   - Verify our `last_updated` fix was included
   - Check if there are newer commits

3. **Review debug output**
   - The HTML debug div should show settings values
   - This will tell us if settings are persisting

### Short Term (Next Session)

1. **Contact Form:**
   - Remove debug div if it's interfering
   - Add more logging to settings save/load
   - Consider simplifying the test (test settings save separately from map rendering)

2. **Turnstile:**
   - Compare with lead's CI results
   - Check if we need to update test helpers
   - Consider if Turnstile needs explicit activation in tests

3. **General:**
   - Review if we need `waitForTimeout()` increases for CI
   - Check if plugin bootstrap is working correctly
   - Verify migrations are being applied

### Long Term

1. **Improve CI reliability**
   - Add retry logic for flaky tests
   - Increase timeouts for CI environment
   - Better logging/debugging

2. **Stabilize test helpers**
   - Make `loginAsAdmin()` more robust
   - Add explicit waits for HTMX swaps
   - Better error messages

---

## 💡 Key Insights

### From Plugin Bootstrap Reference

Based on the lead developer's explanation:
- Core plugins (with `core-` prefix) are auto-activated
- Non-core plugins need explicit activation in tests
- Contact Form and Turnstile are **app plugins**, not core plugins
- They require migrations in `my-sonicjs-app/migrations/`
- They need explicit activation (either in test or via bootstrap)

**This might be the root cause!** The Contact Form and Turnstile might not be getting:
1. Installed via migration in CI
2. Activated before tests run

---

## 🔧 Potential Quick Fixes

### Contact Form
```typescript
// In test file, before testing map:
await navigateToAdminSection(page, 'Plugins')
await page.click('[data-plugin-id="contact-form"] button:has-text("Activate")')
await page.waitForLoadState('networkidle')
```

### Both Plugins
Check that `my-sonicjs-app/wrangler.toml` has:
```toml
migrations_dir = "./migrations"  # NOT "../packages/core/migrations"
```

This ensures app-specific plugin migrations run in CI.

---

**Next Action:** Download and review the Contact Form test artifacts to see the exact failure.
