# Contact Form Plugin Routes Not Mounting Properly

## 🐛 Bug Description

The Contact Form Plugin is not accessible in the admin interface when running the application locally. While the public contact form at `/contact` works, the admin settings page at `/admin/plugins/contact-form/` returns a 404 error.

## 🔍 Root Cause

The plugin uses `PluginBuilder` to define routes, but there is no integration between the `PluginBuilder` pattern and the core app's plugin loading system. The plugin object is imported but its routes are not being mounted.

**Current behavior in `my-sonicjs-app/src/index.ts`:**
```typescript
import contactFormPlugin from './plugins/contact-form/index'

// Plugin is imported but routes are not mounted
const coreApp = createSonicJSApp(config)
```

**Plugin structure in `contact-form/index.ts`:**
```typescript
// Uses PluginBuilder pattern
builder.addRoute('/', publicRoutes, { ... })
builder.addRoute('/admin/plugins/contact-form', adminRoutes, { ... })
return builder.build()
```

## 🎯 Expected Behavior

1. Admin settings page should be accessible at `/admin/plugins/contact-form/`
2. Plugin should appear in the admin sidebar menu
3. Plugin routes should be automatically mounted when the plugin is imported

## 💥 Impact

- **Severity**: High
- **Affects**: Contact form plugin admin functionality
- **Workaround**: Manual route mounting (non-standard approach)

## 🔧 Reproduction Steps

1. Run `npm run dev` from project root
2. Navigate to `http://localhost:8787/admin`
3. Look for "Contact Form" in sidebar → **NOT PRESENT**
4. Try to access `http://localhost:8787/admin/plugins/contact-form/` → **404 Error**
5. Try to access `http://localhost:8787/contact` → **Works** (public route)

## 🌍 Environment

- **Branch**: `main`
- **Node**: v18+
- **Package**: `@sonicjs-cms/core@2.5.0`
- **Platform**: Local development (Wrangler dev server)

## 📋 Possible Solutions

### Option 1: Add Plugin Route Mounting Support to Core
Add support for mounting plugin routes in `createSonicJSApp()`:

```typescript
// In packages/core/src/app.ts
export interface SonicJSConfig {
  plugins?: {
    directory?: string
    autoLoad?: boolean
    disableAll?: boolean
    customPlugins?: Plugin[]  // ADD THIS
  }
}
```

### Option 2: Manual Route Mounting (Temporary Workaround)
Explicitly mount plugin routes in `my-sonicjs-app/src/index.ts`:

```typescript
// Mount contact form plugin routes explicitly
if (contactFormPlugin.routes) {
  app.route('/', contactFormPlugin.routes[0].handler) // Public
  app.route('/admin/plugins/contact-form', contactFormPlugin.routes[1].handler) // Admin
}
```

### Option 3: Plugin Auto-Loading
Implement the `autoLoad` functionality to scan and mount plugins from the directory.

## 🔗 Related

- Contact Form Plugin PR: #536
- Plugin System Documentation: `docs/plugins/plugin-development-guide.md`
- PluginBuilder SDK: `packages/core/src/plugins/sdk/plugin-builder.ts`

## ✅ Acceptance Criteria

- [ ] Admin settings page accessible at `/admin/plugins/contact-form/`
- [ ] Public contact form still works at `/contact`
- [ ] Plugin appears in admin sidebar menu (if menu integration is implemented)
- [ ] No breaking changes to existing plugin system
- [ ] Documentation updated with plugin mounting examples

## 📝 Additional Notes

This appears to be a gap between the `PluginBuilder` SDK and the core app's plugin integration. The plugin is properly structured but there's no mechanism to automatically mount its routes when using the builder pattern.

The issue was discovered during local testing after the Contact Form Plugin was merged to main (#536).
