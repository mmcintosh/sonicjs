# 🔍 Contact Form - Debug Deploy

**Status:** 🏃 CI Running  
**Commit:** Latest (with debug logging)  
**Goal:** Find out WHY settings save returns 500

---

## What We Know

✅ **Test activates plugin successfully** - "Contact Form plugin already active"  
✅ **Settings page loads**  
✅ **Form fills correctly**  
✅ **Our fix removed `status = 'active'` from UPDATE**  
❌ **Settings save STILL returns 500**

---

## What We DON'T Know

❓ **What's the actual SQL error?**  
❓ **Is the plugin row even in the database?**  
❓ **Does the UPDATE fail or the INSERT fail?**  
❓ **Is it a permission issue?**  
❓ **Is it a D1 syntax issue?**

---

## What We Added

### Comprehensive Debug Logging

```typescript
console.log('[ContactService.saveSettings] Starting save for plugin:', manifest.id)
console.log('[ContactService.saveSettings] Settings:', JSON.stringify(settings))
console.log('[ContactService.saveSettings] Existing row:', JSON.stringify(existing))

if (existing) {
  console.log('[ContactService.saveSettings] Updating existing row...')
  const result = await this.db...run()
  console.log('[ContactService.saveSettings] UPDATE result:', JSON.stringify(result))
} else {
  console.log('[ContactService.saveSettings] No existing row, inserting new...')
  const result = await this.db...run()
  console.log('[ContactService.saveSettings] INSERT result:', JSON.stringify(result))
}

// Enhanced error logging
console.error('[ContactService.saveSettings] ERROR:', error)
console.error('[ContactService.saveSettings] Error message:', error.message)
console.error('[ContactService.saveSettings] Error stack:', error.stack)
throw new Error(`Failed to save contact form settings: ${error.message}`)
```

---

## What We'll See Next CI Run

### If UPDATE path:
```
[ContactService.saveSettings] Starting save for plugin: contact-form
[ContactService.saveSettings] Settings: {...}
[ContactService.saveSettings] Existing row: {id: "contact-form", status: "active"}
[ContactService.saveSettings] Updating existing row...
[ContactService.saveSettings] ERROR: [ACTUAL D1 ERROR HERE]
```

### If INSERT path:
```
[ContactService.saveSettings] Starting save for plugin: contact-form
[ContactService.saveSettings] Settings: {...}
[ContactService.saveSettings] Existing row: null
[ContactService.saveSettings] No existing row, inserting new...
[ContactService.saveSettings] ERROR: [ACTUAL D1 ERROR HERE]
```

###  If SUCCESS (shouldn't happen, but...):
```
[ContactService.saveSettings] Starting save for plugin: contact-form
[ContactService.saveSettings] Settings: {...}
[ContactService.saveSettings] Existing row: {...}
[ContactService.saveSettings] Updating existing row...
[ContactService.saveSettings] UPDATE result: {...}
[ContactService.saveSettings] Successfully updated
[ContactService.saveSettings] Settings saved successfully
```

---

## Possible Root Causes

### Theory 1: Plugin Row Doesn't Exist
- Migration didn't run
- Migration failed silently
- Row was deleted somehow
- **Would trigger INSERT path**

### Theory 2: Column Name Still Wrong
- We fixed `updated_at` → `last_updated`
- But maybe there's another column issue?
- **Would show D1 syntax error**

### Theory 3: JSON Stringification Issue
- `JSON.stringify(settings)` produces invalid JSON?
- D1 can't store it?
- **Would show JSON parse/stringify error**

### Theory 4: Permissions/Binding Issue
- D1 binding not available in CI?
- Read-only mode?
- **Would show D1 connection error**

### Theory 5: Manifest Issue
- `manifest.id` is undefined/wrong?
- `manifest.name` has special characters?
- **Would show in "Starting save" log**

---

## Next Steps

1. **Wait ~15 min** for CI to complete
2. **Check logs** for `[ContactService.saveSettings]` entries
3. **Identify the exact error**
4. **Apply targeted fix**
5. **Test again**

---

**Current Time:** ~22:40 UTC  
**Expected CI Complete:** ~22:55 UTC  
**Watch:** https://github.com/mmcintosh/sonicjs/actions

---

**This is detective work!** We're adding forensic logging to catch the criminal (the bug) red-handed. 🕵️
