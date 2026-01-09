# 🎯 DIAGNOSIS: Contact Form Test Failure

## Root Cause Identified! 

**Location:** `my-sonicjs-app/src/plugins/contact-form/services/contact.ts:69`

```typescript
.prepare(`UPDATE plugins SET settings = ?, last_updated = ?, status = 'active' WHERE id = ?`)
```

## The Problem

**The `saveSettings()` method is trying to ACTIVATE the plugin while saving settings!**

### Why This Causes 500 Error

1. **Migration installs plugin** with `status = 'inactive'` (line 26 in `030_contact_form_plugin.sql`)
2. **Test navigates to settings page** without activating plugin
3. **Test fills form and clicks "Save Settings"**
4. **`saveSettings()` tries to UPDATE with `status = 'active'`** ← THIS IS WRONG!
5. **Something in the activation logic fails** because plugin lifecycle wasn't followed

### Expected Behavior

`saveSettings()` should **ONLY save settings**, not change activation status:

```typescript
UPDATE plugins SET settings = ?, last_updated = ? WHERE id = ?
```

**Activation should be done via `activate()` method**, which has its own logic.

---

## 🔧 The Fix

### Change in `contact.ts:69`

**BEFORE:**
```typescript
await this.db
  .prepare(`UPDATE plugins SET settings = ?, last_updated = ?, status = 'active' WHERE id = ?`)
  .bind(JSON.stringify(settings), Date.now(), manifest.id)
  .run()
```

**AFTER:**
```typescript
await this.db
  .prepare(`UPDATE plugins SET settings = ?, last_updated = ? WHERE id = ?`)
  .bind(JSON.stringify(settings), Date.now(), manifest.id)
  .run()
```

### Also Change in `contact.ts:76` (INSERT case)

**BEFORE:**
```typescript
INSERT INTO plugins (id, name, display_name, description, version, status, settings, installed_at, last_updated)
VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
```

**AFTER:**
```typescript
INSERT INTO plugins (id, name, display_name, description, version, status, settings, installed_at, last_updated)
VALUES (?, ?, ?, ?, ?, 'inactive', ?, ?, ?)
```

---

## Why This Is The Root Cause

### Evidence:

1. ✅ All column names are correct (`last_updated`, `installed_at`)
2. ✅ Migration file exists and creates plugin row
3. ✅ Settings page loads (so plugin row exists)
4. ❌ Settings save fails with 500 (because it tries to activate)

### Why It Fails:

**From PLUGIN_BOOTSTRAP_REFERENCE.md:**
> Non-core plugins (without `core-` prefix) are installed but remain inactive

**Contact Form is NOT a core plugin**, so:
- Migration installs it as `inactive`
- Plugin needs explicit activation
- `saveSettings()` shouldn't change status

### Why It Worked Locally:

You probably activated the plugin manually before testing settings!

---

## 🚀 Complete Fix

### File: `my-sonicjs-app/src/plugins/contact-form/services/contact.ts`

**Change 1:** Line 69 (UPDATE)
```typescript
.prepare(`UPDATE plugins SET settings = ?, last_updated = ? WHERE id = ?`)
.bind(JSON.stringify(settings), Date.now(), manifest.id)
```

**Change 2:** Line 76-77 (INSERT)
```typescript
INSERT INTO plugins (id, name, display_name, description, version, status, settings, installed_at, last_updated)
VALUES (?, ?, ?, ?, ?, 'inactive', ?, ?, ?)
```

**Change 3:** Test needs to activate plugin BEFORE testing settings

In `tests/e2e/37-contact-form-plugin.spec.ts`, add before the test:
```typescript
test.beforeAll(async ({ page }) => {
  await loginAsAdmin(page)
  
  // Activate Contact Form plugin
  await page.goto('/admin/plugins')
  const contactFormRow = page.locator('tr:has-text("Contact Form")')
  const activateButton = contactFormRow.locator('button:has-text("Activate")')
  
  if (await activateButton.isVisible()) {
    await activateButton.click()
    await page.waitForResponse(resp => resp.url().includes('/activate') && resp.status() === 200)
  }
})
```

---

## ✅ Expected Result After Fix

1. Migration creates plugin as `inactive`
2. Test activates plugin explicitly
3. Settings save ONLY updates settings (not status)
4. Map renders correctly
5. Test passes ✅

---

## 📋 Implementation Checklist

- [ ] Remove `status = 'active'` from UPDATE query (line 69)
- [ ] Change INSERT to use `'inactive'` instead of `'active'` (line 77)
- [ ] Add plugin activation to test `beforeAll` hook
- [ ] Test locally with fresh D1 database
- [ ] Commit and push
- [ ] Verify CI passes

---

**Confidence Level:** 95% - This is almost certainly the root cause!
