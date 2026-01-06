# AI Search Plugin Troubleshooting Guide

## Quick Checks

### 1. Check if Plugin is Installed
Run this SQL query in your D1 database:
```sql
SELECT id, name, display_name, status, is_core FROM plugins WHERE id = 'ai-search' OR name = 'ai-search-plugin';
```

If no results, the plugin needs to be installed.

### 2. Manual Installation
If auto-install didn't work, manually install via:
- Go to `/admin/plugins`
- Find "AI Search" in the available plugins list
- Click "Install"
- Click "Activate"

Or use the API:
```bash
curl -X POST http://localhost:8787/admin/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"name": "ai-search-plugin"}'
```

### 3. Check Route Registration
The routes should be registered at:
- GET `/admin/plugins/ai-search` - Settings page
- POST `/admin/plugins/ai-search` - Update settings
- POST `/api/search` - Search endpoint
- GET `/api/search/suggest` - Autocomplete

### 4. Check Server Logs
Look for these log messages on server start:
```
[PluginBootstrap] Installing plugin: AI Search
[PluginBootstrap] Activating newly installed core plugin: AI Search
```

### 5. Verify Plugin Bootstrap
Check `packages/core/src/services/plugin-bootstrap.ts` - AI Search should be in the `CORE_PLUGINS` array.

### 6. Check Database Migration
Ensure migration `027_ai_search_plugin.sql` has been run:
```sql
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%ai_search%';
```

Should show:
- `ai_search_history`
- `ai_search_index_meta`

## Common Issues

### Issue: Plugin shows but settings page is blank
**Solution**: Check browser console for JavaScript errors. The collections might not be loading.

### Issue: Routes return 404
**Solution**: Restart the dev server. Routes are registered at app startup.

### Issue: Collections don't show as checkboxes
**Solution**: 
1. Check server logs for `[AISearchService.getAllCollections]` messages
2. Verify collections exist: `SELECT id, name, display_name FROM collections WHERE is_active = 1`
3. Check that collection IDs are strings (not numbers)

### Issue: Settings don't save
**Solution**: 
1. Check browser network tab - POST request should go to `/admin/plugins/ai-search`
2. Verify plugin is active: `SELECT status FROM plugins WHERE id = 'ai-search'`
3. Check settings are stored: `SELECT settings FROM plugins WHERE id = 'ai-search'`

## Debug Steps

1. **Check Plugin Status**:
   ```sql
   SELECT * FROM plugins WHERE id = 'ai-search';
   ```

2. **Check Settings**:
   ```sql
   SELECT settings FROM plugins WHERE id = 'ai-search';
   ```

3. **Check Collections**:
   ```sql
   SELECT id, name, display_name FROM collections WHERE is_active = 1;
   ```

4. **Check Routes** (in browser console):
   ```javascript
   fetch('/admin/plugins/ai-search').then(r => r.text()).then(console.log)
   ```

## Files Changed

- `packages/core/src/services/plugin-bootstrap.ts` - Added AI Search to CORE_PLUGINS
- `packages/core/src/plugins/core-plugins/ai-search-plugin/routes/admin.ts` - Routes at `/` not `/settings`
- `packages/core/src/plugins/core-plugins/ai-search-plugin/components/settings-page.ts` - Updated fetch URLs
- `packages/core/src/plugins/core-plugins/ai-search-plugin/services/ai-search.ts` - Fixed collection ID types (string not number)
- `packages/core/src/plugins/core-plugins/ai-search-plugin/types.ts` - Updated all IDs to strings

## Next Steps

1. Restart dev server completely
2. Check `/admin/plugins` - AI Search should appear
3. If not installed, install manually
4. Activate the plugin
5. Visit `/admin/plugins/ai-search`
6. Check browser console and server logs for errors
