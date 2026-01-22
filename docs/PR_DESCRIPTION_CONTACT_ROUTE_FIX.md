# Fix: Contact Form Plugin Route Mounting

## 🐛 Problem

The Contact Form Plugin is not accessible in the admin interface. While the public contact form at `/contact` works, the admin settings page returns 404.

**Root cause**: The plugin uses `PluginBuilder` to define routes, but there's no integration to automatically mount these routes in the core app.

## 🔧 Solution

This PR adds explicit route mounting for the Contact Form Plugin as a temporary workaround until core plugin integration is fully implemented.

### Changes

1. **Explicit Route Mounting** (`my-sonicjs-app/src/index.ts`):
   ```typescript
   // Mount contact form plugin routes explicitly
   app.route('/', contactFormPlugin.routes![0].handler) // Public routes
   app.route('/admin/plugins/contact-form', contactFormPlugin.routes![1].handler) // Admin routes
   ```

2. **Multi-Account Support** (`my-sonicjs-app/wrangler.toml`):
   ```toml
   account_id = "f61c658f1de7911b0a529f38308adb21"
   ```
   Added account_id to fix "More than one account available" error during database operations.

3. **Issue Documentation** (`docs/issues/contact-plugin-route-mounting-issue.md`):
   - Detailed problem description
   - Reproduction steps
   - Proposed long-term solutions

## ✅ Testing

- [x] Public contact form accessible at `/contact`
- [x] Admin settings accessible at `/admin/plugins/contact-form/`
- [x] Form submission works
- [x] Settings save/load correctly
- [x] No breaking changes to existing functionality

## 📸 Screenshots

**Before**: 404 error when accessing admin routes  
**After**: Admin settings page renders correctly

## 🔗 Related

- Related to Contact Form Plugin PR #536
- Issue: [Link will be added]

## 📋 Checklist

- [x] Code follows project conventions
- [x] Changes are well-documented
- [x] No breaking changes
- [x] Tested locally
- [x] Issue documentation created

## 💡 Future Work

This is a **temporary workaround**. Long-term solutions include:

1. **Option A**: Add `customPlugins` support to `SonicJSConfig`
2. **Option B**: Implement plugin auto-loading from directory
3. **Option C**: Enhance `PluginBuilder` to auto-register with core

See `docs/issues/contact-plugin-route-mounting-issue.md` for detailed analysis.

## 🎯 Impact

**Severity**: High - Blocks admin access to contact form plugin  
**Risk**: Low - Isolated change, no core modifications  
**Type**: Bug Fix / Workaround

---

Ready for review! This fix enables immediate use of the Contact Form Plugin admin interface while we design a proper plugin integration system.
