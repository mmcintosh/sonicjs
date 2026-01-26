# Upstream Sync Analysis - Before Forms PR Submission

**Date**: January 26, 2026  
**Branch State**: Fork is 9 commits ahead, 30 commits behind upstream  
**Upstream**: https://github.com/lane711/sonicjs.git (main)

## Executive Summary

✅ **Safe to sync** - Upstream changes are mostly docs, blog posts, and isolated bug fixes that won't conflict with the Forms PR.

## Our 9 Commits Ahead (Should NOT go upstream)

These are CI workflow fixes specific to our fork that shouldn't be submitted:

```
ffbaa152 fix: use jq to parse KV list JSON output
e2dd4d56 fix: remove --json flag from wrangler kv list (not supported)
5b237a8e fix: add fallback grep extraction for KV ID
c94f968d fix: use jq to extract KV ID from list output
4a2599e6 fix: improve KV ID extraction and error handling
019bf3d1 fix: improve KV creation error visibility
3d855eac fix: remove jq dependency from KV namespace creation
dc075ced fix: improve KV/R2 creation with better error handling
7198afb0 fix: dynamically create KV and R2 resources in CI
```

**Note**: These commits fix hardcoded KV/R2 IDs in `my-sonicjs-app/wrangler.toml` for our fork's CI. They are fork-specific workflow improvements.

## Upstream's 30 Commits We're Behind

### Categorized Changes:

#### 1. Documentation & Blog Posts (Majority - Low Risk)
- ✅ `e619dcac` docs: add Troubleshooting guide and Security best practices (#575)
- ✅ `321e29ce` docs: complete Phase 1 with Workflow and Configuration docs (#574)
- ✅ `0c450c2e` docs: add documentation for undocumented plugins and hook reference (#573)
- ✅ `8ad586d9` blog: add 4 headless CMS comparison posts
- ✅ `6a77ee52` docs(blog): add NestJS vs SonicJS vs Hono comparison post
- ✅ `c9d850fc` blog: add Strapi vs Sanity vs SonicJS comparison post
- ✅ `7f219429` feat: add Strapi vs Directus vs SonicJS comparison blog post (#565)
- ✅ `277c72a6` blog: add SEO blog post for AI coding practice (#564)
- ✅ `849f03fe` feat: add comprehensive Strapi vs Payload vs SonicJS comparison blog post (#563)
- ✅ `41b90838` docs: add PR Maker agent documentation to ai-agents page (#560)

All in `www/` directory (marketing site) - **no conflicts with Forms PR**.

#### 2. Bug Fixes (Low-Medium Risk)
- ⚠️ `236176de` fix: register cache plugin routes in admin UI (fixes #461) (#561)
  - **File**: `packages/core/src/app.ts`
  - **Change**: Added cache plugin route registration
  - **Conflict Risk**: LOW - Our Forms PR also modifies `app.ts` but in different sections
  
- ⚠️ `b2f53aad` fix: resolve TypeScript type error in plugin route handlers
  - **File**: `packages/core/src/app.ts`
  - **Change**: Added `as any` type casts to plugin route handlers
  - **Conflict Risk**: LOW - Type fixes, shouldn't affect Forms code
  
- ✅ `25f13a0c` fix: avoid select options TDZ in dynamic field renderer
  - **File**: `packages/core/src/templates/components/dynamic-field.template.ts`
  - **Conflict Risk**: NONE - Forms PR doesn't touch dynamic-field component
  
- ✅ `6a1a8733` fix: correct publishedAt dates to 2026
- ✅ `682fa6a5` fix: escape angle brackets in MDX blog posts

#### 3. Releases & Version Bumps (Safe - Auto-generated)
- ✅ `f1bcd895` docs(www): add v2.7.0 to changelog and homepage
- ✅ `a9cef32e` chore: rebuild artifacts for v2.7.0 publish
- ✅ `3bb036e7` chore: release v2.7.0
- ✅ `7b480348` chore: update homepage with v2.6.0 release and rebuild dist
- ✅ `2d6b4e01` chore: release v2.6.0

#### 4. New E2E Tests (No Conflicts)
- ✅ `e2097ee2` test: add e2e test for content deletion UI bug (Issue #522) (#559)
  - **File**: `tests/e2e/42-content-deletion-bug.spec.ts` (new file)
  - **Conflict Risk**: NONE - Different test file numbers (42 vs 50-51)

## Overlapping Files Analysis

Only **3 files** are modified by both upstream and our Forms PR:

### 1. `packages/core/src/app.ts`

**Upstream Changes:**
- Added cache plugin route registration (line ~197)
- Added `as any` type casts to plugin route handlers (lines ~207, 213, 222)

**Our Forms PR Changes:**
- Added Forms plugin registration and routes

**Conflict Assessment:** ⚠️ **LOW RISK**
- Changes are in adjacent sections of the same file
- Both add plugin registrations (different plugins)
- Standard 3-way merge should handle this automatically
- If conflict occurs: Keep both sets of changes

### 2. `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`

**Upstream Changes:**
- Added "Cache" menu item to sidebar navigation (~line 515)

**Our Forms PR Changes:**
- Added "Forms" menu item to sidebar navigation

**Conflict Assessment:** ⚠️ **LOW RISK**
- Both adding items to the same navigation array
- Simple merge conflict, easy to resolve: keep both menu items

### 3. `packages/core/src/db/migrations-bundle.ts`

**Upstream Changes:**
- Rebuilt bundle (auto-generated file)

**Our Forms PR Changes:**
- Rebuilt bundle with Forms migrations (auto-generated file)

**Conflict Assessment:** ⚠️ **MEDIUM RISK**
- **This is an auto-generated file** from all SQL migrations
- After syncing upstream, we'll need to **rebuild** this file
- **Solution**: Run `npm run build:migrations` after sync

## Files Changed by Upstream (Not in Our PR)

These will merge cleanly with no conflicts:

### Core Code Changes:
- `packages/core/src/plugins/cache/routes.ts` (cache plugin fix)
- `packages/core/src/templates/components/dynamic-field.template.ts` (TDZ fix)
- `packages/core/src/templates/pages/admin-cache.template.ts` (cache UI)
- `packages/core/src/templates/pages/admin-content-list.template.ts` (content list)
- `packages/core/src/__tests__/routes/admin-cache.test.ts` (cache tests)
- `packages/core/src/__tests__/templates/dynamic-field.test.ts` (field tests)

### Test Files:
- `tests/e2e/42-content-deletion-bug.spec.ts` (new)
- `tests/e2e/42-dynamic-field-tdz.spec.ts` (new)
- `tests/e2e/43-cache-plugin.spec.ts` (new)

### Documentation & Marketing:
- All `www/` changes (blog posts, docs, images)
- `docs/ai/plans/` (AI planning docs)

### Dependencies:
- `package.json` / `package-lock.json` updates

## Recommended Sync Strategy

### Option 1: Sync Now (Before PR Submission) - RECOMMENDED

**Pros:**
- Submit PR against latest upstream
- Easier for maintainer to review
- Conflicts handled by us, not maintainer

**Cons:**
- Must resolve merge conflicts now
- May need to retest after sync

**Steps:**
```bash
# 1. Backup current state
git branch backup/forms-pr-pre-sync

# 2. Sync main branch with upstream
git checkout main
git fetch upstream
git merge upstream/main
# Resolve any conflicts in app.ts and admin-layout-catalyst.template.ts

# 3. Rebuild migrations bundle
npm run build:migrations
git add packages/core/src/db/migrations-bundle.ts
git commit -m "chore: rebuild migrations bundle after upstream sync"

# 4. Push synced main
git push origin main

# 5. Rebase Forms PR onto synced main
git checkout feature/formio-integration
git rebase main
# Resolve any conflicts (same 3 files likely)

# 6. Rebuild and test
npm install
npm run build
npm run type-check
npm test

# 7. Force push rebased branch
git push --force-with-lease origin feature/formio-integration

# 8. Verify CI passes with new base
```

### Option 2: Sync After PR Submission

**Pros:**
- Submit PR immediately
- Let maintainer decide timing

**Cons:**
- PR may have conflicts when maintainer tries to merge
- Maintainer might ask us to rebase anyway

## Recommendation

✅ **Sync now (Option 1)** because:

1. **Low conflict risk** - Only 3 overlapping files with simple conflicts
2. **Clean PR** - Maintainer sees Forms PR on top of latest code
3. **We control timing** - Handle conflicts on our schedule, not during review
4. **Best practice** - Submit PRs against latest upstream

## Post-Sync Testing Checklist

After syncing, verify:

- [ ] `npm install` (update dependencies)
- [ ] `npm run build` (ensure no build errors)
- [ ] `npm run type-check` (TypeScript compiles)
- [ ] `npm test` (unit tests pass)
- [ ] `npm run e2e:smoke` (smoke tests pass)
- [ ] Forms plugin appears in admin sidebar
- [ ] Cache plugin appears in admin sidebar (new from upstream)
- [ ] Form builder loads correctly
- [ ] Turnstile component works in forms
- [ ] CI passes on GitHub Actions

## Summary

**Safe to sync**: Yes  
**Conflict risk**: Low (3 files, simple merges)  
**Recommended approach**: Sync before PR submission  
**Estimated effort**: 30-60 minutes (sync + test)

The upstream changes are primarily documentation and isolated bug fixes that complement rather than conflict with our Forms work.
