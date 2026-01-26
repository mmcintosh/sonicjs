# Upstream Sync Strategy - Preserving Fork-Specific CI Fixes

## Current Situation

- **Fork's `main` branch**: 9 commits ahead of upstream (CI workflow fixes)
- **Forms PR branch**: Based on fork's main (includes those 9 commits)
- **Goal**: Sync with upstream without losing CI fixes

## The 9 Fork-Specific Commits

These commits fix hardcoded Cloudflare resource IDs in CI for our fork:

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

**Key point**: These are needed for fork's CI but should NOT go upstream.

## Strategy: Create a Fork-Maintenance Branch

### Step 1: Preserve CI Fixes in a Dedicated Branch

```bash
# On current feature branch
git checkout feature/formio-integration

# Create a branch to preserve the fork-specific CI fixes
git branch fork/ci-fixes ffbaa152
# This saves all 9 CI commits starting from the first one

# Tag it for extra safety
git tag fork-ci-fixes-backup ffbaa152
```

### Step 2: Reset Fork's Main to Match Upstream

```bash
# Clean any uncommitted changes
git clean -fd packages/core/dist
git checkout -- packages/core/dist packages/core/src/db/migrations-bundle.ts

# Checkout main
git checkout main

# Reset main to match upstream (removes our 9 commits)
git fetch upstream
git reset --hard upstream/main

# Force push to fork (this removes the 9 commits from fork's main)
git push --force-with-lease origin main
```

### Step 3: Rebase Forms PR onto Clean Main

```bash
# Checkout Forms PR
git checkout feature/formio-integration

# Rebase onto the new clean main (without the 9 CI commits)
git rebase main

# Resolve conflicts in:
# - packages/core/src/app.ts (cache plugin + forms plugin)
# - packages/core/src/templates/layouts/admin-layout-catalyst.template.ts (cache menu + forms menu)
# - packages/core/src/db/migrations-bundle.ts (rebuild after merge)

# After resolving conflicts, rebuild migrations
npm run build:migrations
git add packages/core/src/db/migrations-bundle.ts
git rebase --continue

# Force push rebased branch
git push --force-with-lease origin feature/formio-integration
```

### Step 4: Restore CI Fixes ONLY to Main

```bash
# After Forms PR is submitted and merged upstream,
# cherry-pick the CI fixes back to fork's main:
git checkout main
git pull upstream main
git cherry-pick 7198afb0..ffbaa152
# This reapplies the 9 CI commits on top of updated main
git push origin main
```

## Alternative: Simpler Approach (Recommended)

Since the CI fixes are in `.github/workflows/pr-tests.yml` which is ONLY used by `pull_request_target` events on the fork:

### Keep CI Fixes, Merge Upstream Into Them

```bash
# 1. Clean dist files
git clean -fd packages/core/dist
git checkout -- packages/core/dist packages/core/src/db/migrations-bundle.ts

# 2. Update main by merging upstream INTO our commits
git checkout main
git fetch upstream
git merge upstream/main
# Resolve conflicts if any

# 3. Rebuild migrations after merge
npm run build:migrations
git add packages/core/src/db/migrations-bundle.ts
git commit -m "chore: rebuild migrations after upstream sync"

# 4. Push updated main
git push origin main

# 5. Rebase Forms PR onto updated main
git checkout feature/formio-integration
git rebase main
# Resolve same conflicts as main had

# 6. Force push Forms PR
git push --force-with-lease origin feature/formio-integration
```

**Why this is simpler:**
- Keeps the CI fixes on fork's main where they're needed
- When Forms PR goes upstream, upstream won't get the workflow changes (they use their own workflow)
- Fork maintains its working CI

## Recommended: Option 2 (Simpler)

**Pros:**
- Keep fork's CI working
- Simpler workflow
- No risk of losing CI fixes

**Cons:**
- Fork's main permanently differs from upstream's main (but only in `.github/workflows/pr-tests.yml`)
- This is actually fine - forks often need custom CI configs

## Commands to Execute (Option 2)

```bash
# 1. Clean workspace
git clean -fd packages/core/dist
git checkout -- packages/core/dist packages/core/src/db/migrations-bundle.ts

# 2. Merge upstream into main
git checkout main
git fetch upstream
git merge upstream/main
# Resolve conflicts (likely in .github/workflows/pr-tests.yml - keep our version)

# 3. Rebuild and commit
npm run build:migrations
git add packages/core/src/db/migrations-bundle.ts
git commit -m "chore: rebuild migrations after upstream sync"
git push origin main

# 4. Rebase Forms PR
git checkout feature/formio-integration
git rebase main
git push --force-with-lease origin feature/formio-integration

# 5. Verify CI passes
# Trigger CI and ensure everything still works
```
