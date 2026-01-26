# Fix: Contact Form Plugin Admin Installation and Route Mounting

Fixes #548

## 🐛 Problem

After the Contact Form Plugin was merged to main (#536), the plugin is non-functional due to two critical issues:

1. **Plugin not in install registry** - Cannot be discovered or installed via Admin UI
2. **Routes not mounting** - Admin settings and public form return 404

## 🔧 Solution

This PR implements the fixes outlined in #548 by:

### 1. Added Contact Form to Plugin Registry
**File:** `packages/core/src/routes/admin-plugins.ts`

- Added Contact Form to `AVAILABLE_PLUGINS` array (line ~17)
- Implemented install handler with default settings (line ~426)

The plugin now appears in Admin → Plugins and can be installed/activated through the UI.

### 2. Mounted Plugin Routes Explicitly  
**File:** `my-sonicjs-app/src/index.ts`

Explicitly mounted the plugin's routes as a temporary workaround:
```typescript
// Mount contact form plugin routes explicitly
app.route('/', contactFormPlugin.routes![0].handler) // Public routes
app.route('/admin/plugins/contact-form', contactFormPlugin.routes![1].handler) // Admin routes
```

**Note:** This is a stopgap solution until proper plugin integration is implemented (see Future Work below).

## ✅ Testing

### Manual Testing Completed
- [x] Plugin appears in Admin → Plugins list
- [x] Clicking "Install" successfully registers plugin
- [x] Clicking "Activate" enables the plugin  
- [x] Plugin shows as "Active" after activation
- [x] Public form accessible at `/contact`
- [x] Admin settings accessible at `/admin/plugins/contact-form/`
- [x] Form submission works correctly
- [x] Settings save and persist

### CI Status
- [x] Unit tests pass
- [x] Build succeeds
- [x] E2E tests pass
- [x] Cloudflare Workers deployment successful

## 📸 Screenshots

**Before:** 
- Plugin not visible in admin
- Routes return 404

**After:**
- ✅ Plugin appears in plugins list
- ✅ Install/Activate works
- ✅ All routes accessible
- ✅ Fully functional

## 💡 Future Work

This PR reveals a **architectural gap** in the plugin system. The `PluginBuilder` SDK defines routes but has no automatic integration with the core app.

**Recommended improvements:**
1. Add `customPlugins` array to `SonicJSConfig`
2. Implement plugin auto-loading from directories
3. Enhance `PluginBuilder` to auto-register with core

See #548 for detailed analysis and proposed solutions.

## 📋 Changes Summary

### Core Package
- `packages/core/src/routes/admin-plugins.ts` - Added Contact Form to registry and install handler
- `packages/core/dist/*` - Rebuilt artifacts

### Sample App
- `my-sonicjs-app/src/index.ts` - Explicit route mounting

### Documentation
- `docs/issues/contact-plugin-route-mounting-issue.md` - Technical analysis
- `docs/issues/contact-plugin-state-zip-field-ui.md` - Minor UI issue (low priority)

## 🎯 Impact

**Severity:** High - Unblocks use of merged Contact Form Plugin  
**Risk:** Low - Isolated changes, no breaking modifications  
**Type:** Bug Fix (post-merge issue)

## 📝 Checklist

- [x] Code follows project conventions
- [x] All tests pass locally
- [x] CI passes
- [x] No breaking changes
- [x] Documentation updated
- [x] Issue linked (#548)

---

**Ready for review!** This fix enables immediate use of the Contact Form Plugin while we design proper plugin integration for the future.

