# Plugin Installation & Activation in CI Tests - Reference

**Source:** Lead Developer (via Claude)  
**Date:** 2026-01-08  
**Context:** How plugins are installed and activated during CI test runs

---

## Key Insight

**YES, plugins ARE installed and activated during CI tests**, but through the **bootstrap process**, not through explicit test installation.

---

## How It Works

### 1. CI Deployment Phase
**File:** `.github/workflows/pr-tests.yml:122-163`

- CI runs `wrangler deploy` to Cloudflare Workers
- This starts the SonicJS application

### 2. App Startup & Bootstrap
**File:** `plugin-bootstrap.ts:175-191`

On application startup, the `PluginBootstrapService` automatically:

1. **Loops through all `CORE_PLUGINS`** (lines 28-170)
2. **Calls `ensurePluginInstalled()`** for each plugin
3. **Installs** plugins that don't exist in the database
4. **Activates core plugins automatically** on first install (lines 236-241)
   - Plugins with `core-` prefix are auto-activated
5. **Always ensures `core-auth` is active** (lines 215-220)

### 3. E2E Tests Run
Tests execute against the deployed preview with all core plugins already bootstrapped.

---

## Plugin Categories

### Core Plugins (Auto-Installed & Auto-Activated)
Plugins with `core-` prefix are automatically activated on first install:

- ✅ `core-auth` (Authentication) - **ALWAYS forced active**
- ✅ `core-media` (Media Manager) - Activated on install
- ✅ `core-cache` (Cache System) - Activated on install

### Non-Core Plugins (Installed but NOT Auto-Activated)
Plugins without `core-` prefix are installed but remain inactive:

- ⏸️ `database-tools` - Installed, inactive
- ⏸️ `seed-data` - Installed, inactive
- ⏸️ `workflow-plugin` - Installed, inactive
- ⏸️ `easy-mdx` - Installed, inactive

---

## Test Helper Activation

**File:** `test-helpers.ts:314-351`

The `loginAsAdmin()` helper also calls:
- `ensureWorkflowPluginActive()` - Navigates to `/admin/plugins` and clicks "Activate" on the Workflow plugin if not already active

**Key Point:** Non-core plugins like Workflow are activated **by test helpers**, not by bootstrap.

---

## Code References

### Bootstrap Service Entry Point
```typescript
// packages/core/src/services/plugin-bootstrap.ts:175-191
export async function initializePlugins(db: D1Database): Promise<void> {
  const service = new PluginBootstrapService(db)
  await service.ensureAllCorePluginsExist()
}
```

### Core Plugin Auto-Activation Logic
```typescript
// packages/core/src/services/plugin-bootstrap.ts:236-241
if (plugin.name.startsWith('core-')) {
  await this.activatePlugin(plugin.id)
  console.log(`[PluginBootstrap] Activating newly installed core plugin: ${plugin.displayName}`)
}
```

### Force Auth Plugin Active
```typescript
// packages/core/src/services/plugin-bootstrap.ts:215-220
const authPlugin = await this.getPluginByName('core-auth')
if (authPlugin && authPlugin.status !== 'active') {
  await this.activatePlugin(authPlugin.id)
  console.log('[PluginBootstrap] Activated core-auth plugin')
}
```

---

## Implications for Testing

### ✅ What's Already Available in CI
- Authentication system (always active)
- Media management
- Cache system
- All core plugins bootstrapped

### ⚠️ What Needs Manual Activation in Tests
- Non-core plugins (workflow, seed-data, etc.)
- Custom/third-party plugins
- App-specific plugins (Contact Form, Turnstile, etc.)

### 📋 Test Writing Guidelines

**For Core Plugins:**
- Assume they're installed and active
- No activation code needed in tests

**For Non-Core Plugins:**
- Use `ensureWorkflowPluginActive()` or similar helpers
- Or explicitly navigate to `/admin/plugins` and activate

**For App Plugins (my-sonicjs-app/src/plugins/):**
- Need migration (`my-sonicjs-app/migrations/`)
- Must be activated explicitly in tests or via plugin settings

---

## Common Issues & Solutions

### Issue: "Plugin not found" in CI
**Cause:** Plugin not in `CORE_PLUGINS` registry or migration not run  
**Solution:** 
- Check `plugin-bootstrap.ts:28-170` for core plugins
- Ensure migration exists in `my-sonicjs-app/migrations/`
- Verify `wrangler.toml` has `migrations_dir = "./migrations"`

### Issue: "Plugin inactive" in tests
**Cause:** Non-core plugin not auto-activated  
**Solution:**
- Add activation logic to test helper
- Or manually activate in test setup

### Issue: Fresh D1 database doesn't have plugin
**Cause:** Plugin not in bootstrap registry and no migration  
**Solution:**
- Add plugin to `CORE_PLUGINS` for auto-install
- Or create migration in `my-sonicjs-app/migrations/`

---

## Key Files to Reference

1. `packages/core/src/services/plugin-bootstrap.ts` - Bootstrap logic
2. `.github/workflows/pr-tests.yml` - CI deployment
3. `tests/e2e/utils/test-helpers.ts` - Test activation helpers
4. `packages/core/src/services/plugin-service.ts` - Plugin CRUD operations
5. `my-sonicjs-app/wrangler.toml` - Migration directory config

---

**Last Updated:** 2026-01-08  
**Status:** Confirmed by lead developer

This reference should be consulted when:
- Writing E2E tests for plugins
- Debugging CI test failures related to plugins
- Understanding why certain plugins are/aren't active in CI
- Determining where to add plugin activation logic
