# AI Search Plugin Branch Notes

## Current Status
- **Branch**: `feature/ai-search-plugin`
- **Base**: Created from `feature/turnstile-plugin`
- **Status**: All changes committed locally, NOT pushed to any remote

## Important: DO NOT PUSH YET

### Cloudflare Preview Deployment
Cloudflare preview deployments are triggered by:
- **GitHub Actions** when a Pull Request is created
- The workflow `.github/workflows/pr-tests.yml` automatically deploys PRs to Cloudflare Workers Preview

### To Avoid Deploying to Cloudflare Preview:
1. **DO NOT** push this branch to `origin` until ready
2. **DO NOT** create a Pull Request until ready
3. Keep all changes **local only** for now

### When Ready to Deploy:
1. Push to your fork: `git push origin feature/ai-search-plugin`
2. Create PR from your fork to upstream
3. Cloudflare preview will auto-deploy for testing
4. Only merge to main when ready for production

## What's Included in This Branch

### New Files:
- `packages/core/src/plugins/core-plugins/ai-search-plugin/` - Full plugin implementation
- `packages/core/migrations/027_ai_search_plugin.sql` - Database migration

### Modified Files:
- `packages/core/src/app.ts` - Route registration (AI Search routes before admin/plugins)
- `packages/core/src/routes/admin-plugins.ts` - Skip AI Search in generic handler
- `packages/core/src/services/plugin-bootstrap.ts` - Add AI Search to CORE_PLUGINS
- `packages/core/src/plugins/core-plugins/index.ts` - Export AI Search plugin
- `packages/core/src/templates/pages/admin-content-list.template.ts` - Add Advanced Search button

## Test Collection Filtering
The plugin now filters out:
- Collections starting with `test_`
- Collections ending with `_test`
- Collections containing `_test_`
- Specific test collections: `large_payload_test`, `concurrent_test`, `test_collection`

## Next Steps
1. ✅ Branch created
2. ✅ Changes committed locally
3. ⏸️ **STOP HERE** - Do not push until ready
4. Test locally first
5. When ready: push and create PR

## Checking What's Deployed
To see what's currently deployed to Cloudflare:
- Check GitHub Actions: https://github.com/mmcintosh/sonicjs/actions
- Look for PR deployments in Cloudflare Dashboard
- Check if `feature/turnstile-plugin` has an open PR (that would have deployed)
