# Contact Form Plugin: Admin Installation and Route Mounting Issues

## 🐛 Problem Summary

After the Contact Form Plugin was merged to main (#536), two issues prevent the plugin from being usable via the admin interface:

1. **Plugin not in install registry** - Plugin doesn't appear in Admin → Plugins list
2. **Routes not mounting** - Admin settings page returns 404 even when plugin is manually configured

## 🔍 Issues Discovered

### Issue 1: Plugin Not Appearing in Admin Plugins List

**Symptom:**
- Navigate to Admin → Plugins
- Contact Form plugin is not visible in the available plugins list
- Cannot install the plugin through the admin UI

**Root Cause:**
The Contact Form plugin is not included in the `AVAILABLE_PLUGINS` array in `packages/core/src/routes/admin-plugins.ts`. This hardcoded registry determines which plugins appear in the admin interface.

**Impact:** High - Users cannot discover or install the plugin through the admin UI.

---

### Issue 2: "Plugin Not Found in Registry" Error on Install Attempt

**Symptom:**
- If plugin is manually added to `AVAILABLE_PLUGINS` array
- Clicking "Install" button returns error: `"Plugin not found in registry"`

**Root Cause:**
The plugin install route (`POST /install`) in `admin-plugins.ts` has hardcoded handlers for specific plugins (FAQ, Demo Login, Core Auth, etc.) but no handler for `contact-form`. When the install endpoint receives a request for an unknown plugin, it returns 404.

**Location:** `packages/core/src/routes/admin-plugins.ts` line ~620
```typescript
return c.json({ error: 'Plugin not found in registry' }, 404)
```

**Impact:** High - Even if users find the plugin, they cannot install it.

---

### Issue 3: Plugin Routes Not Mounting

**Symptom:**
- Public contact form at `/contact` returns 404
- Admin settings page at `/admin/plugins/contact-form/` returns 404
- Plugin collections exist in database but pages are inaccessible

**Root Cause:**
The Contact Form plugin uses `PluginBuilder` pattern to define routes:
```typescript
// In my-sonicjs-app/src/plugins/contact-form/index.ts
builder.addRoute('/', publicRoutes, { ... })
builder.addRoute('/admin/plugins/contact-form', adminRoutes, { ... })
return builder.build()
```

However, there's **no integration** between `PluginBuilder` and the core app's plugin loading system. The plugin is imported but its routes are never mounted:

```typescript
// In my-sonicjs-app/src/index.ts
import contactFormPlugin from './plugins/contact-form/index'

// Plugin is imported but routes are NOT mounted
const coreApp = createSonicJSApp(config)
```

**Impact:** High - Plugin is completely non-functional after installation.

---

## 🌍 Environment

- **Branch:** `main` (post-merge of #536)
- **Affected Plugin:** Contact Form Plugin v1.0.0
- **Package:** `@sonicjs-cms/core@2.5.0`
- **Platform:** All environments (local dev, CI, production)

## 📋 Reproduction Steps

### Test 1: Plugin Visibility
1. Run `npm run dev` from project root
2. Navigate to `http://localhost:8787/admin`
3. Click on "Plugins" in sidebar
4. **Expected:** See "Contact Form" in available plugins
5. **Actual:** Contact Form plugin is not listed

### Test 2: Manual Installation Attempt
1. Manually add Contact Form to `AVAILABLE_PLUGINS` in `admin-plugins.ts`
2. Rebuild core: `npm run build:core`
3. Restart dev server
4. Navigate to Admin → Plugins
5. Click "Install" on Contact Form plugin
6. **Expected:** Plugin installs successfully
7. **Actual:** Error "Plugin not found in registry"

### Test 3: Route Access
1. Navigate to `http://localhost:8787/contact`
2. **Expected:** Contact form page loads
3. **Actual:** 404 Not Found

4. Navigate to `http://localhost:8787/admin/plugins/contact-form/`
5. **Expected:** Admin settings page loads
6. **Actual:** 404 Not Found

## 🔧 Proposed Solutions

### Solution for Issues 1 & 2: Add to Install Registry

**File:** `packages/core/src/routes/admin-plugins.ts`

**Step 1:** Add to `AVAILABLE_PLUGINS` array (~line 16):
```typescript
const AVAILABLE_PLUGINS = [
  {
    id: 'contact-form',
    name: 'contact-form',
    display_name: 'Contact Form',
    description: 'Professional contact form with Google Maps integration, message storage, and configurable company information',
    version: '1.0.0',
    author: 'SonicJS Community',
    category: 'communication',
    icon: '✉️',
    permissions: ['contact_form.manage', 'contact_form.view'],
    dependencies: [],
    is_core: false
  },
  // ... existing plugins
]
```

**Step 2:** Add install handler (~line 426):
```typescript
// Handle Contact Form plugin installation
if (body.name === 'contact-form') {
  const contactPlugin = await pluginService.installPlugin({
    id: 'contact-form',
    name: 'contact-form',
    display_name: 'Contact Form',
    description: 'Professional contact form with Google Maps integration, message storage, and configurable company information',
    version: '1.0.0',
    author: 'SonicJS Community',
    category: 'communication',
    icon: '✉️',
    permissions: ['contact_form.manage', 'contact_form.view'],
    dependencies: [],
    is_core: false,
    settings: {
      companyName: 'My Company',
      phoneNumber: '555-0199',
      description: '',
      address: '123 Web Dev Lane',
      city: '',
      state: '',
      showMap: false,
      mapApiKey: '',
      useTurnstile: false
    }
  })

  return c.json({ success: true, plugin: contactPlugin })
}
```

---

### Solution for Issue 3: Mount Plugin Routes

**File:** `my-sonicjs-app/src/index.ts`

**Temporary Workaround** (until proper plugin integration is built):
```typescript
// Create main app and mount plugin routes
const app = new Hono()

// Mount contact form plugin routes explicitly
if (contactFormPlugin.routes) {
  app.route('/', contactFormPlugin.routes[0].handler) // Public routes
  app.route('/admin/plugins/contact-form', contactFormPlugin.routes[1].handler) // Admin routes
}

// Mount core app
app.route('/', coreApp)
```

---

## 💡 Long-Term Architecture Improvements

This issue reveals a **gap in the plugin system architecture**. The `PluginBuilder` SDK provides a nice API for defining plugins, but there's no mechanism to automatically integrate them with the core app.

### Recommended Improvements:

**Option A: Add `customPlugins` Configuration**
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

**Option B: Implement Plugin Auto-Loading**
Scan the plugins directory and automatically mount routes from discovered plugins.

**Option C: Enhance PluginBuilder Integration**
Make `PluginBuilder` automatically register plugins with the core app when `.build()` is called.

See `docs/issues/contact-plugin-route-mounting-issue.md` for detailed analysis.

---

## ✅ Testing Requirements

After applying fixes, verify:

**Admin Interface:**
- [ ] Plugin appears in Admin → Plugins list
- [ ] Clicking "Install" successfully registers plugin in database
- [ ] Clicking "Activate" enables the plugin
- [ ] Plugin shows as "Active" after activation

**Route Access:**
- [ ] Public form accessible at `/contact`
- [ ] Admin settings accessible at `/admin/plugins/contact-form/`
- [ ] Form submission works correctly
- [ ] Settings save and persist

**Integration:**
- [ ] No breaking changes to existing plugins
- [ ] All existing tests pass
- [ ] Type checking passes: `npm run type-check`
- [ ] E2E tests pass: `npm run e2e`

---

## 📝 Additional Context

### Related Files
- `packages/core/src/routes/admin-plugins.ts` - Admin plugin routes and registry
- `packages/core/src/plugins/plugin-manager.ts` - Plugin loading logic
- `packages/core/src/app.ts` - Core app configuration
- `my-sonicjs-app/src/index.ts` - Sample app entry point
- `my-sonicjs-app/src/plugins/contact-form/index.ts` - Contact Form plugin

### Related Issues/PRs
- #536 - Original Contact Form Plugin PR (merged)

### Documentation
- `docs/plugins/plugin-development-guide.md` - Plugin development guide
- `docs/issues/contact-plugin-route-mounting-issue.md` - Detailed technical analysis

---

## 🎯 Priority

**Severity:** High - Plugin is non-functional in current state  
**Urgency:** High - Blocks usage of merged feature  
**Complexity:** Medium - Well-understood problems with clear solutions  
**Type:** Bug Fix + Architecture Gap

---

## 🤝 Contributing

This issue is ready for implementation. A fix is available on branch `fix/contact-plugin-route-mounting` and has been tested locally. PR will be created after CI validation passes.

**Labels:** `bug`, `plugin-system`, `contact-plugin`, `high-priority`, `post-merge-issue`
